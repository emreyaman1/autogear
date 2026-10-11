// gearbox: picks the model and effort of every main-thread request from the
// prompt that started the turn, never above what the picker holds.

import type { EngineInterface, Register, TurnStepInput, TurnUsage } from 'claude-code'

import { classifierPrompt, parseTier, RUBRIC } from './core/llm'
import { asEffort, displayModel, FAMILIES, FAMILY_NAMES, familyOf, MODEL_IDS, type Effort } from './core/models'
import { pace } from './core/pacing'
import { decide, type Decision } from './core/policy'
import { applyCommand, DEFAULTS, readSettings, readStats, type Settings } from './core/settings'
import { classify, normalize, parseOverrides, type RuleResult } from './core/signals'
import { tierSpec, type Tier } from './core/tiers'

// Prompts a person sent: the rest (task notifications, peers, plugins) carry
// on with the last choice.
const USER_ORIGINS = new Set(['composer', 'bridge', 'sdk', 'slack-ping', 'unclassified'])

const SOURCE_NAMES: Record<string, string> = {
  rules: 'kural',
  haiku: 'Haiku',
  override: 'elle',
  inherit: 'devam',
  escalate: 'yükseltme',
}

const HELP = [
  '/gear                   durum ve son karar',
  '/gear oto | sabitle     yönlendiriciyi aç / kapat (sabit: seçici ne diyorsa o)',
  '/gear profil tasarruf | dengeli | kalite',
  "/gear haiku aç | kapa   önemsiz işler Haiku'ya gitsin mi",
  "/gear sor aç | kapa     kurallar emin olamazsa Haiku'ya sorulsun mu",
  '/gear not aç | kapa     cevabın altındaki satır',
  'Mesajın başında: +haiku +sonnet +opus, +low … +max, +ucuz, +derin',
].join('\n')

// What the router remembers within one load of the module.
type State = {
  settings: Settings
  pending: { text: string; rule: RuleResult } | undefined
  last: Decision | undefined
  ceilingSeen: string | undefined
  complaints: number
  decisions: Map<string, Decision>
}

const kilo = (tokens: number): string => (tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K` : String(tokens))

const onOff = (value: boolean): string => (value ? 'açık' : 'kapalı')

function tierLabel(state: State, decision: Decision): string {
  return tierSpec(state.settings.profile, decision.tier).label
}

function showStatus($: EngineInterface, state: State): void {
  const { settings, last } = state
  $.ui.status(
    settings.mode === 'pin' ? '⚙ gearbox: sabit (seçici)'
    : last === undefined ? `⚙ gearbox: otomatik · ${settings.profile}`
    : `⚙ ${FAMILY_NAMES[last.family]}·${last.effort} · T${last.tier} ${tierLabel(state, last)}`,
  )
}

function remember($: EngineInterface, state: State, turnId: string, decision: Decision): Decision {
  state.decisions.set(turnId, decision)
  if (state.decisions.size > 50) {
    const oldest = state.decisions.keys().next().value
    if (oldest !== undefined) {
      state.decisions.delete(oldest)
    }
  }
  state.last = decision
  showStatus($, state)

  return decision
}

function noticeCeiling($: EngineInterface, state: State, model: string, effort: Effort | undefined): void {
  const seen = `${displayModel(model)} · ${effort ?? 'varsayılan efor'}`
  if (state.ceilingSeen !== undefined && seen !== state.ceilingSeen) {
    $.ui.toast(`gearbox tavanı: ${seen}`)
  }
  state.ceilingSeen = seen
}

async function readUsage($: EngineInterface) {
  try {
    return await $.session.usage()
  } catch {
    return undefined
  }
}

async function askHaiku($: EngineInterface, text: string, previous: Tier | undefined): Promise<Tier | undefined> {
  try {
    const reply = await $.model.complete({
      model: 'haiku',
      system: RUBRIC,
      prompt: classifierPrompt(text, previous),
      maxTokens: 256,
      effort: 'low',
      timeoutMs: 6000,
    })

    return reply.isAnswered ? parseTier(reply.text) : undefined
  } catch {
    return undefined
  }
}

async function decideTurn(
  $: EngineInterface,
  state: State,
  e: Pick<TurnStepInput, 'turnId' | 'model' | 'effort'>,
): Promise<Decision | undefined> {
  const family = familyOf(e.model)
  if (family === undefined) {
    return undefined
  }
  const ceiling = { family, effort: asEffort(e.effort) }
  noticeCeiling($, state, e.model, ceiling.effort)
  const taken = state.pending
  state.pending = undefined
  const usage = await readUsage($)
  const currentPace = pace(usage?.rateLimits ?? [], await $.clock.now())
  const common = {
    profile: state.settings.profile,
    ceiling,
    previous: state.last,
    contextTokens: usage?.context.tokens,
    pace: currentPace,
    allowHaiku: state.settings.allowHaiku,
  }
  if (taken === undefined) {
    if (state.last === undefined) {
      return undefined
    }
    const kept = decide({ ...common, tier: state.last.tier, source: 'inherit', reasons: ['kullanıcı mesajı yok: son seçim'] })

    return remember($, state, e.turnId, kept)
  }

  let { tier, reasons } = taken.rule
  let source: string = taken.rule.source
  if (taken.rule.confidence === 'low' && state.settings.askHaiku && currentPace.level !== 'critical') {
    const asked = await askHaiku($, taken.text, state.last?.tier)
    if (asked !== undefined) {
      tier = asked
      source = 'haiku'
      reasons = [...reasons, `Haiku: T${asked}`]
    }
  }

  return remember($, state, e.turnId, decide({ ...common, tier, source, reasons, override: taken.rule.override }))
}

function footer(state: State, decision: Decision, usage: TurnUsage | undefined): string {
  const model = usage === undefined ? FAMILY_NAMES[decision.family] : displayModel(usage.model)
  const why = decision.reasons.slice(0, 2).join('; ')
  const cache =
    usage === undefined
      ? ''
      : ` · önbellek ${kilo(usage.cache_read_input_tokens)} okundu / ${kilo(usage.cache_creation_input_tokens)} yazıldı`
  const source = SOURCE_NAMES[decision.source] ?? decision.source

  return `⚙ ${model} · ${decision.effort} · T${decision.tier} ${tierLabel(state, decision)} (${source}: ${why})${cache}`
}

async function countTurn($: EngineInterface, decision: Decision): Promise<void> {
  try {
    const stats = readStats(await $.store.get('stats'))
    stats.turns += 1
    stats.byFamily[decision.family] = (stats.byFamily[decision.family] ?? 0) + 1
    stats.overrides += decision.source === 'override' ? 1 : 0
    stats.escalations += decision.source === 'escalate' ? 1 : 0
    await $.store.set('stats', stats)
  } catch {
    // Statistics are a nicety: a store that refuses them changes no answer.
  }
}

async function describe($: EngineInterface, state: State): Promise<string> {
  const { settings, last } = state
  const stats = readStats(await $.store.get('stats'))
  const perFamily = FAMILIES.map(family => `${FAMILY_NAMES[family]} ${stats.byFamily[family] ?? 0}`).join(', ')

  return [
    `gearbox ${settings.mode === 'auto' ? 'otomatik' : 'sabit (seçici)'} · profil ${settings.profile} · Haiku ${onOff(settings.allowHaiku)} · Haiku'ya sor ${onOff(settings.askHaiku)} · not ${onOff(settings.footer)}`,
    `Tavan (seçici): ${state.ceilingSeen ?? 'henüz istek yok'}`,
    last === undefined
      ? 'Son karar: yok'
      : `Son karar: ${FAMILY_NAMES[last.family]} · ${last.effort} · T${last.tier} ${tierLabel(state, last)} (${SOURCE_NAMES[last.source] ?? last.source}: ${last.reasons.join('; ')})`,
    `Toplam ${stats.turns} tur: ${perFamily} · elle ${stats.overrides} · yükseltme ${stats.escalations}`,
    '',
    HELP,
  ].join('\n')
}

async function loadSettings($: EngineInterface, state: State): Promise<void> {
  state.settings = readSettings(await $.store.get('settings'))
  showStatus($, state)
  await $.command.register({
    name: 'gear',
    description: 'gearbox: otomatik model ve efor seçimi',
    argumentHint: '[oto | sabitle | profil <ad> | haiku | sor | not]',
  })
  if ((await $.store.get('tipShown')) !== true) {
    $.ui.toast(
      'gearbox açık: seçicideki model ve efor tavan sayılır, gearbox bunun altında seçer. Tam otomatik için seçiciyi Opus · high yap.',
      { timeoutMs: 12000 },
    )
    await $.store.set('tipShown', true)
  }
}

async function runCommand($: EngineInterface, state: State, args: string): Promise<{ text: string }> {
  const [verb = '', value = ''] = normalize(args).trim().split(/\s+/)
  const changed = applyCommand(state.settings, verb, value)
  if (changed === 'status') {
    return { text: await describe($, state) }
  }
  if (changed === 'help') {
    return { text: HELP }
  }
  state.settings = changed
  await $.store.set('settings', changed)
  showStatus($, state)

  return { text: `gearbox: ${changed.mode === 'auto' ? 'otomatik' : 'sabit (seçici)'} · profil ${changed.profile}` }
}

export const register: Register = on => {
  const state: State = {
    settings: DEFAULTS,
    pending: undefined,
    last: undefined,
    ceilingSeen: undefined,
    complaints: 0,
    decisions: new Map(),
  }

  on('session.start', async ($, e, next) => {
    await loadSettings($, state)

    return next(e)
  })

  on('prompt.submit', ($, e, next) => {
    if (!USER_ORIGINS.has(e.origin.kind)) {
      return next(e)
    }
    const parsed = parseOverrides(e.text)
    const rule = classify(parsed.text, {
      prevTier: state.last?.tier,
      hasAttachments: (e.attachments?.length ?? 0) > 0,
      frustrationStreak: state.complaints,
    })
    state.complaints = rule.source === 'escalate' ? state.complaints + 1 : 0
    state.pending = {
      text: parsed.text,
      rule:
        parsed.override === undefined
          ? rule
          : {
              ...rule,
              confidence: 'high',
              source: 'override',
              override: parsed.override,
              reasons: [`elle: ${parsed.tokens.join(' ')}`, ...rule.reasons],
            },
    }

    return parsed.text === e.text ? next(e) : next({ ...e, text: parsed.text })
  })

  // Every request of a turn goes out on the turn's one model: a switch inside
  // a turn would drop the cache and the thinking the turn has built up.
  on('turn.step', async function* ($, e, next) {
    if (state.settings.mode === 'pin' || e.agentId !== undefined) {
      return yield* next(e)
    }
    const decision = state.decisions.get(e.turnId) ?? (e.index === 0 ? await decideTurn($, state, e) : undefined)
    if (decision === undefined) {
      return yield* next(e)
    }
    const model = familyOf(e.model) === decision.family ? e.model : MODEL_IDS[decision.family]

    return yield* next({ ...e, model, effort: decision.effort })
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const decision = e.agentId === undefined ? state.decisions.get(e.turnId) : undefined
    if (decision === undefined) {
      return result
    }
    await countTurn($, decision)

    return state.settings.footer ? { ...result, text: footer(state, decision, e.usage) } : result
  })

  on('command.run', { command: 'gear' }, ($, e) => runCommand($, state, e.args))
}
