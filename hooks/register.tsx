// gearbox: picks the model and effort of every main-thread request from the
// prompt that started the turn, never above what the picker holds.

import { atom, read, update } from 'claude-code'
import type {
  EngineInterface,
  Register,
  SessionRateLimit,
  TurnStepChunk,
  TurnStepInput,
  TurnUsage,
} from 'claude-code'

import { savingsCard, type LimitRow } from './card'
import { classifierPrompt, parseTier, RUBRIC } from './core/llm'
import { asEffort, displayModel, FAMILIES, FAMILY_NAMES, familyOf, MODEL_IDS, type Effort, type Family } from './core/models'
import { pace } from './core/pacing'
import { decide, type Decision } from './core/policy'
import { costOf, readTokens, turnMoney, usd } from './core/prices'
import { addTurn, emptyTotals, savedOf, savingsText, sumOf, type Totals } from './core/savings'
import { applyCommand, DEFAULTS, readSettings, readStats, type Settings } from './core/settings'
import { classify, normalize, parseOverrides, type RuleResult } from './core/signals'
import { SWITCH_HEIGHT, SWITCH_OFF, SWITCH_ON, SWITCH_WIDTH, switchSvg } from './core/switch'
import { tierSpec, toTier, type Tier } from './core/tiers'
import { isNewerThan, TESTED_THROUGH } from './core/version'
import type { GearboxMode } from '../types'

// Prompts a person sent: the rest (task notifications, peers, plugins) carry
// on with the last choice.
const USER_ORIGINS = new Set(['composer', 'bridge', 'sdk', 'slack-ping', 'unclassified'])

// Commands whose failure means the work is not done: tests, builds, linters.
const CHECK_COMMAND =
  /\b(?:test|tests|jest|vitest|pytest|mocha|tsc|eslint|lint|build|make|gradle|mvn|cargo|go (?:test|build|vet)|dotnet (?:build|test)|node --test)\b/

// After this many turns in a row answered by another model than the one
// chosen, gearbox concludes its choices no longer take effect and stands down.
const MISMATCH_LIMIT = 3

const SOURCE_NAMES: Record<string, string> = {
  rules: 'kural',
  haiku: 'Haiku',
  override: 'elle',
  inherit: 'devam',
  escalate: 'yükseltme',
}

const WINDOW_NAMES: Record<string, string> = { five_hour: '5 saatlik', seven_day: 'haftalık' }

const LIMIT_TITLES: Record<string, string> = { five_hour: 'Oturum sınırı · 5 saat', seven_day: 'Haftalık sınır' }

// A desktop Button draws its label and nothing else: three em spaces make one
// that is blank and wider than the switch it is laid over.
const BLANK_LABEL = '\u2003'.repeat(3)

const HELP = [
  '| Komut | İş |',
  '|:--|:--|',
  '| `/gear` | durum, son karar, limitler |',
  '| `/gear tasarruf` | harcama, seçici modeliyle olacak harcama, tasarruf |',
  '| `/gear sifirla` | tasarruf sayacını sıfırla |',
  "| `/gear oto` · `/gear sabitle` | gearbox'ı aç · kapat (kapalıyken seçici model kullanılır) |",
  '| `/gear profil <ad>` | tasarruf, dengeli ya da kalite |',
  "| `/gear haiku aç` · `kapa` | önemsiz işler Haiku'ya gitsin mi |",
  "| `/gear sor aç` · `kapa` | kurallar emin olamazsa Haiku'ya sorulsun mu |",
  '| `/gear not aç` · `kapa` | cevabın altındaki satır |',
  '| `/gear bant aç` · `kapa` | istem kutusunun üstündeki aç/kapa düğmesi |',
  '',
  'Mesajın başına yazılan etiketler: `+haiku` `+sonnet` `+opus`, `+low` … `+max`, `+ucuz`, `+derin`.',
].join('\n')

// What the router remembers within one load of the module.
type State = {
  settings: Settings
  pending: { text: string; rule: RuleResult } | undefined
  last: Decision | undefined
  ceilingSeen: string | undefined
  complaints: number
  decisions: Map<string, Decision>
  // Families a request failed on this session; they are routed around.
  unavailable: Set<Family>
  // Turns in a row the API answered with another model than the one chosen.
  mismatches: number
  // Set once choices stopped taking effect: requests go as the picker says.
  isStoodDown: boolean
  // The last test or build command of the main thread failed...
  lastCheckFailed: boolean
  // ...and the turn ended that way, so the next one gets a stronger model.
  carryFailure: boolean
  limits: readonly SessionRateLimit[]
  // This session's money, and the family that answered the turn before.
  session: Totals
  lastAnswered: Family | undefined
  // What gearbox's own questions to Haiku cost since the last turn ended.
  overhead: number
}

const modeAtom = atom({ plugin: 'gearbox', key: 'mode' } as const, 'auto')

const kilo = (tokens: number): string => (tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K` : String(tokens))

const onOff = (value: boolean): string => (value ? 'açık' : 'kapalı')

const clock = (iso: string): string => {
  const date = new Date(iso)

  return Number.isNaN(date.getTime()) ? '' : `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function tierLabel(state: State, decision: Decision): string {
  return tierSpec(state.settings.profile, decision.tier).label
}

function isRouting(state: State): boolean {
  return state.settings.mode === 'auto' && !state.isStoodDown
}

function modeOf(state: State): GearboxMode {
  return state.isStoodDown ? 'down' : state.settings.mode
}

// " · $1.42 tasarruf" once this session has saved a cent.
function savedNote(state: State): string {
  const saved = savedOf(state.session)

  return saved >= 0.01 ? ` · ${usd(saved)} tasarruf` : ''
}

function showStatus($: EngineInterface, state: State): void {
  const { settings, last } = state
  const mode = modeOf(state)
  void update($, modeAtom, () => mode)
  $.ui.status(
    mode === 'down' ? '⚙ gearbox: devre dışı (seçici), /gear'
    : mode === 'pin' ? '⚙ gearbox: kapalı (seçici model)'
    : last === undefined ? `⚙ gearbox: otomatik · ${settings.profile}`
    : `⚙ ${FAMILY_NAMES[last.family]}·${last.effort} · T${last.tier} ${tierLabel(state, last)}${savedNote(state)}`,
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

async function askHaiku($: EngineInterface, text: string, previous: Tier | undefined): Promise<{ tier: Tier | undefined; cost: number }> {
  try {
    const reply = await $.model.complete({
      model: 'haiku',
      system: RUBRIC,
      prompt: classifierPrompt(text, previous),
      maxTokens: 256,
      effort: 'low',
      timeoutMs: 6000,
    })

    return { tier: reply.isAnswered ? parseTier(reply.text) : undefined, cost: costOf('haiku', readTokens(reply.usage ?? {})) }
  } catch {
    return { tier: undefined, cost: 0 }
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
  state.limits = usage?.rateLimits ?? state.limits
  const currentPace = pace(usage?.rateLimits ?? [], await $.clock.now())
  const common = {
    profile: state.settings.profile,
    ceiling,
    previous: state.last,
    contextTokens: usage?.context.tokens,
    pace: currentPace,
    allowHaiku: state.settings.allowHaiku,
    unavailable: [...state.unavailable],
  }
  if (taken === undefined) {
    if (state.last === undefined) {
      return undefined
    }
    const kept = decide({ ...common, tier: state.last.tier, source: 'inherit', reasons: ['kullanıcı mesajı yok: son seçim'] })

    return remember($, state, e.turnId, { ...kept, ceilingModel: e.model })
  }

  let { tier, reasons } = taken.rule
  let source: string = taken.rule.source
  if (taken.rule.confidence === 'low' && state.settings.askHaiku && currentPace.level !== 'critical') {
    const asked = await askHaiku($, taken.text, state.last?.tier)
    state.overhead += asked.cost
    if (asked.tier !== undefined) {
      tier = asked.tier
      source = 'haiku'
      reasons = [...reasons, `Haiku: T${asked.tier}`]
    }
  }
  // A step that ended with failing tests is not built on by a weaker model.
  if (state.carryFailure && taken.rule.override === undefined) {
    tier = toTier(tier + 1)
    reasons = [...reasons, 'önceki turda test/derleme başarısız kaldı: +1 kademe']
  }
  state.carryFailure = false

  return remember($, state, e.turnId, { ...decide({ ...common, tier, source, reasons, override: taken.rule.override }), ceilingModel: e.model })
}

// The routed request got no answer at all (a retired model id, a model the
// plan lacks): the family is avoided for the rest of the session and the
// turn carries on as the picker says.
function noteUnavailable($: EngineInterface, state: State, e: Pick<TurnStepInput, 'turnId' | 'model' | 'effort'>, decision: Decision): void {
  state.unavailable.add(decision.family)
  const family = familyOf(e.model) ?? decision.family
  state.decisions.set(e.turnId, {
    ...decision,
    family,
    effort: asEffort(e.effort) ?? decision.effort,
    reasons: [...decision.reasons, `${MODEL_IDS[decision.family]} yanıt vermedi`],
  })
  $.ui.toast(`gearbox: ${MODEL_IDS[decision.family]} yanıt vermedi; bu oturumda kullanmıyorum, seçicideki model devam ediyor.`, { timeoutMs: 10000 })
}

type TurnMoney = { spent: number; baseline: number }

function footer(state: State, decision: Decision, usage: TurnUsage | undefined, money: TurnMoney | undefined): string {
  const model = usage === undefined ? FAMILY_NAMES[decision.family] : displayModel(usage.model)
  const why = decision.reasons.slice(0, 2).join('; ')
  const cache =
    usage === undefined
      ? ''
      : ` · önbellek ${kilo(usage.cache_read_input_tokens)} okundu / ${kilo(usage.cache_creation_input_tokens)} yazıldı`
  const source = SOURCE_NAMES[decision.source] ?? decision.source
  const cost = money === undefined ? '' : ` · ${usd(money.spent)} (seçici modeliyle ${usd(money.baseline)})`

  return `⚙ ${model} · ${decision.effort} · T${decision.tier} ${tierLabel(state, decision)} (${source}: ${why})${cache}${cost}`
}

async function afterTurn($: EngineInterface, state: State, decision: Decision, usage: TurnUsage | undefined): Promise<TurnMoney | undefined> {
  // The API names the model that answered: if it is not the chosen one, turn
  // after turn, the plugin API has changed under gearbox and it stands down.
  const answered = familyOf(usage?.model)
  if (answered !== undefined) {
    state.mismatches = answered === decision.family ? 0 : state.mismatches + 1
    if (state.mismatches >= MISMATCH_LIMIT && !state.isStoodDown) {
      state.isStoodDown = true
      $.ui.toast(
        `gearbox: seçtiğim model ${MISMATCH_LIMIT} turdur uygulanmıyor, kendimi kapattım; istekler seçicideki modelle gidiyor. /gear oto ile yeniden dener.`,
        { timeoutMs: 15000 },
      )
      showStatus($, state)
    }
  }
  state.carryFailure = state.lastCheckFailed && decision.tier < 4
  state.lastCheckFailed = false

  // The turn's tokens at the answering model's price and at the picker's.
  const tokens = usage === undefined ? undefined : readTokens(usage)
  const family = answered ?? decision.family
  const money =
    tokens === undefined
      ? undefined
      : turnMoney(family, familyOf(decision.ceilingModel) ?? family, tokens, state.lastAnswered !== undefined && state.lastAnswered !== family)
  state.lastAnswered = answered ?? state.lastAnswered
  const overhead = state.overhead
  state.overhead = 0
  if (money !== undefined && tokens !== undefined) {
    addTurn(state.session, family, money, tokens)
  } else {
    state.session.families[decision.family].turns += 1
  }
  state.session.overhead += overhead
  showStatus($, state)
  try {
    const stats = readStats(await $.store.get('stats'))
    if (money !== undefined && tokens !== undefined) {
      addTurn(stats, family, money, tokens)
    } else {
      stats.families[decision.family].turns += 1
    }
    stats.overhead += overhead
    stats.since = stats.since === 0 ? await $.clock.now() : stats.since
    stats.overrides += decision.source === 'override' ? 1 : 0
    stats.escalations += decision.source === 'escalate' ? 1 : 0
    await $.store.set('stats', stats)
  } catch {
    // Statistics are a nicety: a store that refuses them changes no answer.
  }

  return money
}

async function describe($: EngineInterface, state: State): Promise<string> {
  const { settings, last } = state
  const stats = readStats(await $.store.get('stats'))
  const perFamily = FAMILIES.map(family => `${FAMILY_NAMES[family]} ${stats.families[family].turns}`).join(', ')
  const limits = state.limits
    .map(limit => `${WINDOW_NAMES[limit.kind] ?? limit.kind} %${Math.round(limit.percentUsed)}${limit.resetsAt === undefined ? '' : ` (sıfırlanma ${clock(limit.resetsAt)})`}`)
    .join(' · ')
  const mode = state.isStoodDown ? 'devre dışı (seçimler uygulanmıyordu)' : settings.mode === 'auto' ? 'açık' : 'kapalı (seçici model)'
  const total = sumOf(stats)

  return [
    `**gearbox ${mode}** · profil ${settings.profile}`,
    '',
    `- **Tavan (seçici):** ${state.ceilingSeen ?? 'henüz istek yok'}`,
    `- **Limitler:** ${limits === '' ? 'henüz bilinmiyor' : limits}`,
    last === undefined
      ? '- **Son karar:** yok'
      : `- **Son karar:** ${FAMILY_NAMES[last.family]} · ${last.effort} · T${last.tier} ${tierLabel(state, last)} (${SOURCE_NAMES[last.source] ?? last.source}: ${last.reasons.join('; ')})`,
    state.unavailable.size === 0 ? undefined : `- **Bu oturumda yanıt vermeyen:** ${[...state.unavailable].map(family => MODEL_IDS[family]).join(', ')}`,
    `- **Toplam:** ${total.turns} tur (${perFamily}) · elle ${stats.overrides} · yükseltme ${stats.escalations}`,
    total.baseline === 0 ? undefined : `- **Tasarruf (tahmin):** ${usd(savedOf(stats))} · ayrıntı için \`/gear tasarruf\``,
    `- **Ayarlar:** Haiku ${onOff(settings.allowHaiku)} · Haiku'ya sor ${onOff(settings.askHaiku)} · not ${onOff(settings.footer)} · bant ${onOff(settings.band)}`,
    '',
    HELP,
  ]
    .filter(line => line !== undefined)
    .join('\n')
}

async function noticeVersion($: EngineInterface): Promise<void> {
  try {
    const { version, base } = await $.session.version()
    if (isNewerThan(base ?? version, TESTED_THROUGH) && (await $.store.get('versionNotice')) !== version) {
      $.ui.toast(
        `gearbox, Claude Code ${version} ile henüz denenmedi. Seçimleri uygulanmazsa kendini kapatır; istersen /gear sabitle.`,
        { timeoutMs: 12000 },
      )
      await $.store.set('versionNotice', version)
    }
  } catch {
    // A notice only: a build that cannot say its version still routes.
  }
}

async function loadSettings($: EngineInterface, state: State): Promise<void> {
  state.settings = readSettings(await $.store.get('settings'))
  showStatus($, state)
  await $.command.register({
    name: 'gear',
    description: 'gearbox: otomatik model ve efor seçimi',
    argumentHint: '[oto | sabitle | profil <ad> | haiku | sor | not | bant | tasarruf | sifirla]',
  })
  await noticeVersion($)
  if ((await $.store.get('tipShown')) !== true) {
    $.ui.toast(
      'gearbox açık: seçicideki model ve efor tavan sayılır, gearbox bunun altında seçer. Tam otomatik için seçiciyi Opus · high yap.',
      { timeoutMs: 12000 },
    )
    await $.store.set('tipShown', true)
  }
}

// One switch for the band's button and for /gear: auto turns routing on (and
// tries again after standing down), pin hands every request to the picker.
async function switchMode($: EngineInterface, state: State, mode: 'auto' | 'pin'): Promise<void> {
  if (mode === 'auto') {
    state.isStoodDown = false
    state.mismatches = 0
    state.unavailable.clear()
  }
  state.settings = { ...state.settings, mode }
  await $.store.set('settings', state.settings)
  showStatus($, state)
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
  if (changed === 'savings') {
    const stats = readStats(await $.store.get('stats'))

    return { text: savingsText(state.session, stats, stats.since) }
  }
  if (changed === 'reset') {
    await $.store.set('stats', readStats(undefined))
    state.session = emptyTotals()
    showStatus($, state)

    return { text: 'gearbox: tasarruf ve tur sayacı sıfırlandı.' }
  }
  // `/gear oto` also tries again after standing down, though the mode was already auto.
  if (changed.mode === 'auto' || changed.mode !== state.settings.mode) {
    await switchMode($, state, changed.mode)
  }
  state.settings = changed
  await $.store.set('settings', changed)
  showStatus($, state)

  return { text: `gearbox: ${changed.mode === 'auto' ? 'açık' : 'kapalı (seçici model)'} · profil ${changed.profile}` }
}

export const register: Register = on => {
  const state: State = {
    settings: DEFAULTS,
    pending: undefined,
    last: undefined,
    ceilingSeen: undefined,
    complaints: 0,
    decisions: new Map(),
    unavailable: new Set(),
    mismatches: 0,
    isStoodDown: false,
    lastCheckFailed: false,
    carryFailure: false,
    limits: [],
    session: emptyTotals(),
    lastAnswered: undefined,
    overhead: 0,
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
  }).catch(($, e, next) => next(e))

  // Every request of a turn goes out on the turn's one model: a switch inside
  // a turn would drop the cache and the thinking the turn has built up.
  on('turn.step', async function* ($, e, next) {
    if (!isRouting(state) || e.agentId !== undefined) {
      return yield* next(e)
    }
    const decision = state.decisions.get(e.turnId) ?? (e.index === 0 ? await decideTurn($, state, e) : undefined)
    if (decision === undefined) {
      return yield* next(e)
    }
    const model = familyOf(e.model) === decision.family ? e.model : MODEL_IDS[decision.family]
    if (model === e.model && decision.effort === e.effort) {
      return yield* next(e)
    }

    // Engine chunks are held back until the answer starts, so a request that
    // gets no answer at all can be sent again on the picker's model cleanly.
    const stream = next({ ...e, model, effort: decision.effort })
    const held: TurnStepChunk[] = []
    let isAnswering = false
    try {
      for await (const chunk of stream) {
        if (isAnswering) {
          yield chunk
        } else {
          held.push(chunk)
          if (chunk.kind !== 'engine') {
            isAnswering = true
            yield* held
          }
        }
      }
      const result = await stream.result
      if (isAnswering || result.stopReason !== null || next.signal.aborted) {
        if (!isAnswering) {
          yield* held
        }

        return result
      }
    } catch (error) {
      if (isAnswering || next.signal.aborted) {
        throw error
      }
    }
    noteUnavailable($, state, e, decision)

    return yield* next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId === undefined && CHECK_COMMAND.test(e.command)) {
      state.lastCheckFailed = ran.isError === true
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const decision = e.agentId === undefined ? state.decisions.get(e.turnId) : undefined
    if (decision === undefined) {
      return result
    }
    const money = await afterTurn($, state, decision, e.usage)

    return state.settings.footer ? { ...result, text: footer(state, decision, e.usage, money) } : result
  })

  // A small row above the prompt with the on/off switch: the status text at
  // the bottom right cannot be pressed, a Button can. The terminal draws the
  // switch as colored Text inside the Button; a desktop draws a Button as its
  // label alone, so there the switch is an Svg with a blank Button laid over it.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !state.settings.band) {
      return next(e)
    }
    const mode = await read($, modeAtom)
    const isOn = mode === 'auto'
    const name = mode === 'auto' ? 'açık' : mode === 'pin' ? 'kapalı' : 'devre dışı'
    const note =
      mode === 'auto' ? 'açık: işe göre model ve efor seçiyor'
      : mode === 'pin' ? 'kapalı: seçicideki model kullanılıyor'
      : 'devre dışı: seçimler uygulanmıyordu, seçicideki model kullanılıyor'
    const flip = () => switchMode($, state, isOn ? 'pin' : 'auto')

    if (e.surface === 'terminal') {
      const { Box, Button, Text } = $.ui.resolve(e)

      return (
        <Box>
          <Text dimColor>⚙ gearbox {note} </Text>
          <Button key="toggle" plain label={`gearbox: ${name}`} onPress={flip}>
            <Text backgroundColor={isOn ? SWITCH_ON : SWITCH_OFF} color="#ffffff" bold>
              {isOn ? ' ON  ● ' : ' ● OFF '}
            </Text>
          </Button>
        </Box>
      )
    }
    const { Box, Button, Svg, Text } = $.ui.resolve(e)

    // The padding leaves the Button, centered over the Svg, room for its whole
    // label: squeezed narrower, a desktop Button draws an ellipsis in it.
    return (
      <Box>
        <Text dimColor>⚙ gearbox {note}</Text>
        <Box alignSelf="center" flexShrink={0} paddingX={3}>
          <Svg source={switchSvg(isOn)} alt={`gearbox: ${name}`} width={SWITCH_WIDTH} height={SWITCH_HEIGHT} />
          <Box position="absolute" top={0} left={0} width="100%" height="100%" alignItems="center" justifyContent="center">
            <Button key="toggle" plain label={BLANK_LABEL} onPress={flip} />
          </Box>
        </Box>
      </Box>
    )
  })

  // `/gear tasarruf` is drawn as a card; its text stays what the model reads.
  on('ui.render', { component: 'CommandOutput', props: { command: 'gear' } }, async ($, e, next) => {
    const [verb = '', value = ''] = normalize(e.props.args).trim().split(/\s+/)
    if (e.props.isErrored || applyCommand(state.settings, verb, value) !== 'savings') {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    const stats = readStats(await $.store.get('stats'))
    const limits: LimitRow[] = state.limits.map(limit => ({
      name: LIMIT_TITLES[limit.kind] ?? limit.kind,
      percentUsed: limit.percentUsed,
      resetsAt: limit.resetsAt === undefined ? '' : `sıfırlanma ${clock(limit.resetsAt)}`,
    }))

    return savingsCard({ Box, Text }, { session: state.session, all: stats, since: stats.since, limits, columns: e.viewport?.columns ?? 80 })
  })

  on('command.run', { command: 'gear' }, ($, e) => runCommand($, state, e.args))
}
