// autogear: picks the model and effort of every main-thread request from the
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
import { doctorText, type Facts } from './core/doctor'
import { cleanNote, dayOf, handoverContext, HANDOVER_TOKENS, isWorkDone, notePrompt, resumeLine } from './core/handover'
import { classifierPrompt, parseTier, RUBRIC } from './core/llm'
import { addEntry, flagLast, journalText, markLast, MARK_NAMES, readJournal, snippet, type Mark } from './core/journal'
import { asEffort, displayModel, FAMILIES, FAMILY_NAMES, familyOf, MODEL_IDS, type Effort, type Family } from './core/models'
import { pace, paceWarning } from './core/pacing'
import { decide, type Decision } from './core/policy'
import { costOf, readTokens, turnMoney, usd } from './core/prices'
import { addTurn, emptyTotals, savedOf, savingsText, sumOf, type Totals } from './core/savings'
import { applyCommand, DEFAULTS, readSettings, readStats, type Settings } from './core/settings'
import { normalize, parseOverrides, withoutNotes, type ParsedPrompt, type RuleResult } from './core/signals'
import { readRule, settle, type Task } from './core/settle'
import { BADGE_COLORS, BADGE_HEIGHT, BADGE_NAMES, badgeSvg, badgeWidth } from './core/switch'
import { asLangSetting, getLang, L, pct, profileName, reasonText, resolveLang, setLang, sourceText, systemLocale, tierName } from './core/text'
import { tierSpec, toTier, type Tier } from './core/tiers'
import { isNewerThan, TESTED_THROUGH } from './core/version'
import type { AutogearMode } from '../types'

// Prompts a person sent: the rest (task notifications, peers, plugins) carry
// on with the last choice.
const USER_ORIGINS = new Set(['composer', 'bridge', 'sdk', 'slack-ping', 'unclassified'])

// Commands whose failure means the work is not done: tests, builds, linters.
const CHECK_COMMAND =
  /\b(?:test|tests|jest|vitest|pytest|mocha|tsc|eslint|lint|build|make|gradle|mvn|cargo|go (?:test|build|vet)|dotnet (?:build|test)|node --test)\b/

// After this many turns in a row answered by another model than the one
// chosen, autogear concludes its choices no longer take effect and stands down.
const MISMATCH_LIMIT = 3

const SOURCE_NAMES: Record<string, string> = {
  rules: 'kural',
  haiku: 'Haiku',
  override: 'elle',
  inherit: 'devam',
  escalate: 'yükseltme',
}

const windowName = (kind: string): string =>
  kind === 'five_hour' ? L('5-hour', '5 saatlik') : kind === 'seven_day' ? L('weekly', 'haftalık') : kind

const limitTitle = (kind: string): string =>
  kind === 'five_hour' ? L('Session limit · 5 hours', 'Oturum sınırı · 5 saat') : kind === 'seven_day' ? L('Weekly limit', 'Haftalık sınır') : kind

const modeName = (mode: AutogearMode): string =>
  mode === 'auto' ? L('on', 'açık') : mode === 'shadow' ? L('shadow', 'gölge') : mode === 'pin' ? L('off', 'kapalı') : L('stopped', 'durdu')

// What each state of the band means, beside its badge.
const modeNote = (mode: AutogearMode): string =>
  mode === 'auto' ? L('picks the model and effort for the work', 'işe göre model ve efor seçiyor')
  : mode === 'shadow' ? L("chooses and writes it down, applies nothing; the picker's model answers", 'seçip yazıyor, uygulamıyor; cevabı seçici veriyor')
  : mode === 'pin' ? L("the picker's model is used", 'seçicideki model kullanılıyor')
  : L("its choices were not applied; the picker's model is used", 'seçimleri uygulanmıyordu; seçicideki model kullanılıyor')

// The band's buttons, each named for what a press does.
const MODE_ACTIONS = [
  { mode: 'auto', key: 'to-auto' },
  { mode: 'shadow', key: 'to-shadow' },
  { mode: 'pin', key: 'to-pin' },
] as const

const actionLabel = (target: AutogearMode, from: AutogearMode): string =>
  target === 'auto' ? (from === 'down' ? L('try again', 'yeniden dene') : L('turn on', 'aç'))
  : target === 'shadow' ? L('to shadow', 'gölgeye al')
  : L('turn off', 'kapat')

// The commands are English in both languages; the old Turkish names keep working.
const help = (): string =>
  [
    L('| Command | What it does |', '| Komut | İş |'),
    '|:--|:--|',
    `| \`/gear\` | ${L('status, last decision, limits', 'durum, son karar, limitler')} |`,
    `| \`/gear savings\` | ${L("spent, what it would have cost on the picker's model, saved", 'harcama, seçici modeliyle olacak harcama, tasarruf')} |`,
    `| \`/gear log\` | ${L("autogear's last decisions and the doubtful ones", "autogear'ın son kararları ve şüpheli olanlar")} |`,
    `| \`/gear wrong weak\` · \`strong\` | ${L("mark the last message's decision: the model was too weak · stronger than needed", 'son mesajın kararını işaretle: model çok zayıftı · gereğinden güçlüydü')} |`,
    `| \`/gear reset\` | ${L('reset the savings counter and the log', 'tasarruf sayacını ve günlüğü sıfırla')} |`,
    `| \`/gear on\` · \`/gear off\` | ${L("turn autogear on · off (off, the picker's model is used)", "autogear'ı aç · kapat (kapalıyken seçici model kullanılır)")} |`,
    `| \`/gear shadow\` | ${L("shadow: chooses and writes it down but applies nothing, the picker's model answers; to try a new version without touching your work", 'gölge: seçer ve yazar ama uygulamaz, cevabı seçicideki model verir; yeni bir sürümü işini etkilemeden denemek için')} |`,
    `| \`/gear profile <name>\` | ${L('saver, balanced or quality', 'saver (tasarruf), balanced (dengeli) ya da quality (kalite)')} |`,
    `| \`/gear haiku on\` · \`off\` | ${L('may trivial work go to Haiku', 'önemsiz işler Haiku\'ya gitsin mi')} |`,
    `| \`/gear ask on\` · \`off\` | ${L('ask Haiku when the rules cannot tell', "kurallar emin olamazsa Haiku'ya sorulsun mu")} |`,
    `| \`/gear note on\` · \`off\` | ${L('the line under each answer', 'cevabın altındaki satır')} |`,
    `| \`/gear band on\` · \`off\` | ${L('the on/off band above the prompt', 'istem kutusunun üstündeki aç/kapa düğmesi')} |`,
    `| \`/gear lang en\` · \`tr\` · \`auto\` | ${L("the language autogear speaks (auto follows the system's)", "autogear'ın konuştuğu dil (auto sistemin dilini izler)")} |`,
    `| \`/gear doctor\` | ${L('check the setup and say what to fix', 'kurulumu kontrol et, düzeltilecek şeyi söyle')} |`,
    '',
    L('Tags at the start of a message: `+haiku` `+sonnet` `+opus`, `+low` … `+max`, `+cheap`, `+deep`.', 'Mesajın başına yazılan etiketler: `+haiku` `+sonnet` `+opus`, `+low` … `+max`, `+cheap`, `+deep`.'),
    L('Or in words: "give this task to sonnet with max", "use opus".', 'Ya da yazıyla: "bu görevi sonnet\'e max ile ver", "opus ile yap", "use opus".'),
    L('The old Turkish names (oto, sabitle, golge, tasarruf, kayit, yanlis, sifirla, profil, sor, not, bant) still work.', 'Eski Türkçe adlar (oto, sabitle, golge, tasarruf, kayit, yanlis, sifirla, profil, sor, not, bant) hâlâ çalışır.'),
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
  // What autogear's own questions to Haiku cost since the last turn ended.
  overhead: number
  // The tier of the work in hand, which a question or a remark in its middle
  // does not drop far below.
  task: Task
  // A commit, a push or a passing test run in this turn of the main thread.
  isWorkDone: boolean
  // A hand-over note is being written.
  isForking: boolean
  // The session the note was written in, for its resume line.
  noteSession: string | undefined
  // The note on its way to the clean conversation, from the press of "temiz
  // sohbet" until the first prompt after the /clear carries it. Kept in the
  // module, which a /clear does not reload.
  handover: { note: string; oldSessionId: string; isCleared: boolean } | undefined
  // The picker's model and effort as the last request saw them.
  ceiling: { model: string; effort: Effort | undefined } | undefined
  // What each main-thread turn was sent as, for the line under its answer.
  sent: Map<string, { model: string; effort: string | undefined }>
  // The models the turn's helpers (subagents) ran on.
  helpers: Set<string>
}

const modeAtom = atom({ plugin: 'autogear', key: 'mode' } as const, 'auto')

const warningAtom = atom({ plugin: 'autogear', key: 'warning' } as const, '')

// The last choice as the band shows it; '' before one.
const noteAtom = atom({ plugin: 'autogear', key: 'note' } as const, '')

// In plan mode, as the engine's plan-mode notes say (the session.append hook
// below). Kept in the session's state, so a reload of the module keeps it.
// Plan mode set in the middle of a turn counts from the next turn: a turn
// keeps its one model.
const planningAtom = atom({ plugin: 'autogear', key: 'planning' } as const, false)

// The hand-over note the band offers; '' when none. Its size, and whether the
// /clear has run and the note waits for the first prompt.
const handoverAtom = atom({ plugin: 'autogear', key: 'handover' } as const, '')

const handoverSizeAtom = atom({ plugin: 'autogear', key: 'handoverTokens' } as const, 0)

const handoverArmedAtom = atom({ plugin: 'autogear', key: 'handoverArmed' } as const, false)

// A note is being written: the turn has ended, the note follows in a few seconds.
const handoverPendingAtom = atom({ plugin: 'autogear', key: 'handoverPending' } as const, false)

const HANDOVER_PANE = 'autogear-handover'

const onOff = (value: boolean): string => (value ? L('on', 'açık') : L('off', 'kapalı'))

const clock = (iso: string): string => {
  const date = new Date(iso)

  return Number.isNaN(date.getTime()) ? '' : `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function tierLabel(state: State, decision: Decision): string {
  return tierName(tierSpec(state.settings.profile, decision.tier).label)
}

function isRouting(state: State): boolean {
  return state.settings.mode === 'auto' && !state.isStoodDown
}

function modeOf(state: State): AutogearMode {
  return state.isStoodDown ? 'down' : state.settings.mode
}

// " · $1.42 tasarruf" once this session has saved a cent.
function savedNote(state: State): string {
  const saved = savedOf(state.session)

  return saved >= 0.01 ? ` · ${usd(saved)} ${L('saved', 'tasarruf')}` : ''
}

function showStatus($: EngineInterface, state: State): void {
  const { settings, last } = state
  const mode = modeOf(state)
  void update($, modeAtom, () => mode)
  // The band says what the last choice was beside the badge, or what the state means before one.
  const choice = last === undefined ? undefined : `${FAMILY_NAMES[last.family]} · ${last.effort} · T${last.tier} ${tierLabel(state, last)}`
  const note = choice === undefined ? '' : mode === 'shadow' ? `${choice} ${L('would choose', 'önerirdi')}` : choice
  void update($, noteAtom, () => note)
  $.ui.status(
    mode === 'down' ? L("⚙ autogear: stopped (the picker's model), /gear", '⚙ autogear: devre dışı (seçici), /gear')
    : mode === 'pin' ? L("⚙ autogear: off (the picker's model)", '⚙ autogear: kapalı (seçici model)')
    : mode === 'shadow'
      ? last === undefined
        ? L('⚙ autogear: in shadow, writing its choices down', '⚙ autogear: gölgede, seçimleri yazıyor')
        : L(`⚙ shadow: ${FAMILY_NAMES[last.family]}·${last.effort} · T${last.tier} would choose`, `⚙ gölge: ${FAMILY_NAMES[last.family]}·${last.effort} · T${last.tier} önerirdi`)
    : last === undefined ? L(`⚙ autogear: automatic · ${profileName(settings.profile)}`, `⚙ autogear: otomatik · ${settings.profile}`)
    : `⚙ ${FAMILY_NAMES[last.family]}·${last.effort} · T${last.tier} ${tierLabel(state, last)}${savedNote(state)}`,
  )
}

// What a main-thread turn was sent as: the model and effort its answer is told by.
function markSent(state: State, turnId: string, model: string, effort: string | undefined): void {
  state.sent.set(turnId, { model, effort })
  if (state.sent.size > 50) {
    const oldest = state.sent.keys().next().value
    if (oldest !== undefined) {
      state.sent.delete(oldest)
    }
  }
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
  const seen = `${displayModel(model)} · ${effort ?? L('default effort', 'varsayılan efor')}`
  if (state.ceilingSeen !== undefined && seen !== state.ceilingSeen) {
    $.ui.toast(L(`autogear ceiling: ${seen}`, `autogear tavanı: ${seen}`))
  }
  state.ceilingSeen = seen
  state.ceiling = { model, effort }
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
    isPlanning: await read($, planningAtom),
  }
  if (taken === undefined) {
    if (state.last === undefined) {
      return undefined
    }
    const kept = decide({ ...common, tier: state.last.tier, source: 'inherit', reasons: ['kullanıcı mesajı yok: son seçim'], hunt: state.last.hunt })
    await showWarning($, state, kept, e)

    return remember($, state, e.turnId, { ...kept, ceilingModel: e.model })
  }

  const { rule } = taken
  let haiku: Tier | undefined
  // Asked whatever the windows say: a choice is never made worse to spare them.
  if (rule.confidence === 'low' && state.settings.askHaiku) {
    const asked = await askHaiku($, taken.text, state.last?.tier)
    state.overhead += asked.cost
    haiku = asked.tier
  }
  // A step that ended with failing tests is not built on by a weaker model.
  const settled = settle(rule, { haiku, task: state.task, carryFailure: state.carryFailure })
  state.carryFailure = false
  state.task = settled.task
  // A go-ahead in the middle of a hunt carries it on at its effort.
  const hunt = rule.hunt ?? (rule.source === 'inherit' ? state.last?.hunt : undefined)
  const decision = decide({ ...common, tier: settled.tier, source: settled.source, reasons: settled.reasons, override: rule.override, hunt })
  await showWarning($, state, decision, e)

  return remember($, state, e.turnId, { ...decision, ceilingModel: e.model, prompt: taken.text })
}

// The band's warning for the turn about to run: the window under pressure and
// what the work runs on, autogear's choice or, in shadow mode, the picker's.
async function showWarning($: EngineInterface, state: State, decision: Decision, e: Pick<TurnStepInput, 'model' | 'effort'>): Promise<void> {
  const running =
    state.settings.mode === 'shadow'
      ? `${displayModel(e.model)} · ${asEffort(e.effort) ?? L('default effort', 'varsayılan efor')}`
      : `${FAMILY_NAMES[decision.family]} · ${decision.effort}`
  await update($, warningAtom, () => paceWarning(decision.limit, running) ?? '')
}

// The prompt as the rules read it. One they cannot read is taken as work, and
// Haiku is asked: a prompt is never let through unread.
function readPrompt(state: State, parsed: ParsedPrompt, hasAttachments: boolean): RuleResult {
  let rule: RuleResult
  try {
    rule = readRule(parsed, { prevTier: state.last?.tier, hasAttachments, frustrationStreak: state.complaints })
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error)
    rule = { tier: toTier(Math.max(2, state.last?.tier ?? 2)), confidence: 'low', source: 'rules', kind: 'work', reasons: [`okunamadı: ${why}`.slice(0, 120)] }
  }
  state.complaints = rule.kind === 'complaint' ? state.complaints + 1 : 0

  return rule
}

// The prompt with its leading +tokens taken off, notes ahead of it kept.
function withoutTokens(text: string, said: string, rest: string): string {
  const tokens = said.slice(0, said.length - rest.length)
  const at = text.indexOf(tokens)

  return at < 0 ? text : `${text.slice(0, at)}${text.slice(at + tokens.length)}`
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
  $.ui.toast(
    L(
      `autogear: ${MODEL_IDS[decision.family]} gave no answer; I will not use it this session, the picker's model carries on.`,
      `autogear: ${MODEL_IDS[decision.family]} yanıt vermedi; bu oturumda kullanmıyorum, seçicideki model devam ediyor.`,
    ),
    { timeoutMs: 10000 },
  )
}

type TurnMoney = { spent: number; baseline: number }

// The line under an answer, in italics: the model that answered and its
// effort, as the API and the request say, and the models of the helpers that
// ran. Beside it, plain: plan mode, and a limit under pressure.
function answerLine(state: State, turnId: string, usage: TurnUsage | undefined, decision: Decision | undefined): string | undefined {
  const sent = state.sent.get(turnId)
  const model = usage === undefined ? sent?.model : usage.model
  if (model === undefined) {
    return undefined
  }
  const name = displayModel(model)
  const effort = sent?.effort ?? decision?.effort
  const parts = [name, ...(effort === undefined ? [] : [`${L('effort', 'efor')} ${effort}`])]
  if (state.helpers.size > 0) {
    parts.push(`${L('helpers', 'yardımcılar')}: ${[...state.helpers].join(', ')}`)
  }
  const extras = [...(decision?.isPlanning === true ? [L('plan mode', 'plan modu')] : []), ...warnings(decision, `${name}${effort === undefined ? '' : ` · ${effort}`}`)]

  return `*${parts.join(' · ')}*${extras.map(extra => ` · ${extra}`).join('')}`
}

// "⚠ 5-hour limit 92%: ..." while a window is under pressure.
function warnings(decision: Decision | undefined, running: string): string[] {
  const warning = paceWarning(decision?.limit, running)

  return warning === undefined ? [] : [`⚠ ${warning}`]
}

// The end of a turn chosen in shadow mode: nothing was applied, so nothing is
// checked against the answer and nothing is saved; the choice goes into the log.
async function afterShadowTurn($: EngineInterface, state: State, decision: Decision, usage: TurnUsage | undefined): Promise<void> {
  const isCheckFailed = state.lastCheckFailed
  state.carryFailure = isCheckFailed && decision.tier < 4
  state.lastCheckFailed = false
  const overhead = state.overhead
  state.overhead = 0
  state.session.overhead += overhead
  showStatus($, state)
  try {
    const stats = readStats(await $.store.get('stats'))
    stats.overhead += overhead
    await $.store.set('stats', stats)
  } catch {
    // Statistics are a nicety.
  }
  await noteDecision($, decision, familyOf(usage?.model), undefined, isCheckFailed)
}

async function afterTurn($: EngineInterface, state: State, decision: Decision, usage: TurnUsage | undefined): Promise<TurnMoney | undefined> {
  // The API names the model that answered: if it is not the chosen one, turn
  // after turn, the plugin API has changed under autogear and it stands down.
  const answered = familyOf(usage?.model)
  if (answered !== undefined) {
    state.mismatches = answered === decision.family ? 0 : state.mismatches + 1
    if (state.mismatches >= MISMATCH_LIMIT && !state.isStoodDown) {
      state.isStoodDown = true
      $.ui.toast(
        L(
          `autogear: the model I chose has not been applied for ${MISMATCH_LIMIT} turns, so I switched myself off; requests go with the picker's model. /gear on tries again.`,
          `autogear: seçtiğim model ${MISMATCH_LIMIT} turdur uygulanmıyor, kendimi kapattım; istekler seçicideki modelle gidiyor. /gear on ile yeniden dener.`,
        ),
        { timeoutMs: 15000 },
      )
      showStatus($, state)
    }
  }
  const isCheckFailed = state.lastCheckFailed
  state.carryFailure = isCheckFailed && decision.tier < 4
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
    await noteDecision($, decision, answered, money, isCheckFailed)
    stats.since = stats.since === 0 ? await $.clock.now() : stats.since
    stats.overrides += decision.source === 'override' ? 1 : 0
    stats.escalations += decision.source === 'escalate' ? 1 : 0
    await $.store.set('stats', stats)
  } catch {
    // Statistics are a nicety: a store that refuses them changes no answer.
  }

  return money
}

// The decision goes into the log: a complaint is about the answer before it,
// a failing check about this one.
async function noteDecision(
  $: EngineInterface,
  decision: Decision,
  answered: Family | undefined,
  money: TurnMoney | undefined,
  isCheckFailed: boolean,
): Promise<void> {
  try {
    const journal = readJournal(await $.store.get('journal'))
    if (decision.source === 'escalate') {
      flagLast(journal, 'şikâyetle yükseltildi')
    }
    if (decision.prompt !== undefined) {
      addEntry(journal, {
        at: await $.clock.now(),
        text: snippet(decision.prompt),
        tier: decision.tier,
        // A shadow entry keeps what autogear chose; the model that answered beside it.
        family: decision.isShadow === true ? decision.family : (answered ?? decision.family),
        effort: decision.effort,
        source: SOURCE_NAMES[decision.source] ?? decision.source,
        ceiling: familyOf(decision.ceilingModel),
        spent: money?.spent ?? 0,
        baseline: money?.baseline ?? 0,
        flags: isCheckFailed ? ['test/derleme kırık'] : [],
        mark: undefined,
        reasons: decision.reasons.slice(0, 6),
        ...(decision.isShadow === true ? { isShadow: true as const, ...(answered === undefined ? {} : { answered }) } : {}),
        ...(decision.wanted === undefined ? {} : { wanted: decision.wanted }),
        ...(decision.isPlanning === true ? { isPlanning: true as const } : {}),
      })
    }
    await $.store.set('journal', journal)
  } catch {
    // A log only: a store that refuses it changes no answer.
  }
}

async function describe($: EngineInterface, state: State): Promise<string> {
  const { settings, last } = state
  const stats = readStats(await $.store.get('stats'))
  const perFamily = FAMILIES.map(family => `${FAMILY_NAMES[family]} ${stats.families[family].turns}`).join(', ')
  const limits = state.limits
    .map(
      limit =>
        `${windowName(limit.kind)} ${pct(Math.round(limit.percentUsed))}${limit.resetsAt === undefined ? '' : ` (${L('resets', 'sıfırlanma')} ${clock(limit.resetsAt)})`}`,
    )
    .join(' · ')
  const mode =
    state.isStoodDown && settings.mode === 'auto' ? L('stopped (its choices were not applied)', 'devre dışı (seçimler uygulanmıyordu)')
    : settings.mode === 'auto' ? L('on', 'açık')
    : settings.mode === 'shadow' ? L('in shadow (chooses and writes it down, applies nothing)', 'gölgede (seçer ve yazar, uygulamaz)')
    : L("off (the picker's model)", 'kapalı (seçici model)')
  const total = sumOf(stats)

  return [
    `**${mode}** · ${L('profile', 'profil')} ${profileName(settings.profile)}`,
    '',
    `- **${L('Ceiling (picker)', 'Tavan (seçici)')}:** ${state.ceilingSeen ?? L('no request yet', 'henüz istek yok')}`,
    `- **${L('Limits', 'Limitler')}:** ${limits === '' ? L('not known yet', 'henüz bilinmiyor') : limits}`,
    (await read($, planningAtom))
      ? L("- **Plan mode:** on; requests go to Opus, effort by the plan's size (under the picker)", "- **Plan modu:** açık; istekler Opus'a, efor planın büyüklüğüne göre (seçicinin altında)")
      : undefined,
    last === undefined
      ? `- **${L('Last decision', 'Son karar')}:** ${L('none', 'yok')}`
      : `- **${L('Last decision', 'Son karar')}:** ${FAMILY_NAMES[last.family]} · ${last.effort} · T${last.tier} ${tierLabel(state, last)} (${sourceText(SOURCE_NAMES[last.source] ?? last.source)}: ${last.reasons.map(reasonText).join('; ')})`,
    state.unavailable.size === 0
      ? undefined
      : `- **${L('Gave no answer this session', 'Bu oturumda yanıt vermeyen')}:** ${[...state.unavailable].map(family => MODEL_IDS[family]).join(', ')}`,
    L(
      `- **Total:** ${total.turns} turns (${perFamily}) · by hand ${stats.overrides} · escalations ${stats.escalations}`,
      `- **Toplam:** ${total.turns} tur (${perFamily}) · elle ${stats.overrides} · yükseltme ${stats.escalations}`,
    ),
    total.baseline === 0
      ? undefined
      : L(`- **Savings (estimate):** ${usd(savedOf(stats))} · see \`/gear savings\``, `- **Tasarruf (tahmin):** ${usd(savedOf(stats))} · ayrıntı için \`/gear savings\``),
    L(
      `- **Settings:** Haiku ${onOff(settings.allowHaiku)} · ask Haiku ${onOff(settings.askHaiku)} · note ${onOff(settings.footer)} · band ${onOff(settings.band)}`,
      `- **Ayarlar:** Haiku ${onOff(settings.allowHaiku)} · Haiku'ya sor ${onOff(settings.askHaiku)} · not ${onOff(settings.footer)} · bant ${onOff(settings.band)}`,
    ),
    '',
    help(),
  ]
    .filter(line => line !== undefined)
    .join('\n')
}

// What /gear doctor looks at.
async function gatherFacts($: EngineInterface, state: State): Promise<Facts> {
  let version: string | undefined
  try {
    const seen = await $.session.version()
    version = seen.base ?? seen.version
  } catch {
    version = undefined
  }
  let isStoreWorking = true
  try {
    const stamp = await $.clock.now()
    await $.store.set('doctor', stamp)
    isStoreWorking = (await $.store.get('doctor')) === stamp
  } catch {
    isStoreWorking = false
  }
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  const given = (value: string | undefined): string | undefined => (value === undefined || value === '' ? undefined : value)

  return {
    mode: modeOf(state),
    profile: state.settings.profile,
    ceiling: state.ceiling === undefined ? undefined : { model: state.ceiling.model, display: displayModel(state.ceiling.model), effort: state.ceiling.effort },
    version,
    testedThrough: TESTED_THROUGH,
    isNewer: version !== undefined && isNewerThan(version, TESTED_THROUGH),
    isStoreWorking,
    mismatches: state.mismatches,
    mismatchLimit: MISMATCH_LIMIT,
    unavailable: [...state.unavailable].map(family => MODEL_IDS[family]),
    hasDecided: state.last !== undefined,
    hasLimits: state.limits.length > 0,
    isPlanning: await read($, planningAtom),
    isFooterOn: state.settings.footer,
    isBandOn: state.settings.band,
    lang: getLang(),
    langSetting: state.settings.lang,
    env: { effortLevel: given(env.CLAUDE_CODE_EFFORT_LEVEL), subagentModel: given(env.CLAUDE_CODE_SUBAGENT_MODEL) },
  }
}

async function noticeVersion($: EngineInterface): Promise<void> {
  try {
    const { version, base } = await $.session.version()
    if (isNewerThan(base ?? version, TESTED_THROUGH) && (await $.store.get('versionNotice')) !== version) {
      $.ui.toast(
        L(
          `autogear has not been tried on Claude Code ${version} yet. If its choices are not applied it switches itself off; or use /gear off.`,
          `autogear, Claude Code ${version} ile henüz denenmedi. Seçimleri uygulanmazsa kendini kapatır; istersen /gear off.`,
        ),
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
  setLang(resolveLang(state.settings.lang, systemLocale()))
  showStatus($, state)
  await $.command.register({
    name: 'gear',
    description: L('autogear: automatic model and effort choice', 'autogear: otomatik model ve efor seçimi'),
    argumentHint: '[on | off | shadow | profile <name> | haiku | ask | note | band | lang | savings | log | wrong | reset | doctor]',
  })
  await noticeVersion($)
  if ((await $.store.get('tipShown')) !== true) {
    $.ui.toast(
      L(
        "autogear is on: the picker's model and effort count as the ceiling, and autogear chooses under it. For full automation set the picker to Opus · high.",
        'autogear açık: seçicideki model ve efor tavan sayılır, autogear bunun altında seçer. Tam otomatik için seçiciyi Opus · high yap.',
      ),
      { timeoutMs: 12000 },
    )
    await $.store.set('tipShown', true)
  }
}

// One switch for the band's buttons and for /gear: auto turns routing on (and
// tries again after standing down), shadow chooses and writes it down, pin
// hands every request to the picker. A state picked by hand ends a stand-down,
// so the band shows the state that was picked.
async function switchMode($: EngineInterface, state: State, mode: Settings['mode']): Promise<void> {
  state.isStoodDown = false
  state.mismatches = 0
  if (mode === 'auto') {
    state.unavailable.clear()
  }
  if (mode === 'pin') {
    // Off, autogear reads no windows: an old warning would stand there unchecked.
    await update($, warningAtom, () => '')
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
    return { text: help() }
  }
  if (changed === 'doctor') {
    return { text: doctorText(await gatherFacts($, state)) }
  }
  if (changed === 'savings') {
    const stats = readStats(await $.store.get('stats'))

    return { text: savingsText(state.session, stats, stats.since) }
  }
  if (changed === 'journal') {
    return { text: journalText(readJournal(await $.store.get('journal'))) }
  }
  if (changed === 'mark') {
    const mark: Mark | undefined =
      ['zayif', 'az', 'dusuk', 'weak', 'low'].includes(value) ? 'zayif' : ['fazla', 'guclu', 'cok', 'strong', 'over', 'too'].includes(value) ? 'fazla' : undefined
    const journal = readJournal(await $.store.get('journal'))
    if (mark === undefined) {
      return {
        text: L(
          'Usage: `/gear wrong weak` (the model was too weak) or `/gear wrong strong` (stronger than needed).',
          'Kullanım: `/gear wrong weak` (model çok zayıftı) ya da `/gear wrong strong` (gereğinden güçlüydü).',
        ),
      }
    }
    const entry = markLast(journal, mark)
    if (entry === undefined) {
      return { text: L('No decision to mark yet.', 'Henüz işaretlenecek bir karar yok.') }
    }
    await $.store.set('journal', journal)

    return {
      text: L(
        `Marked: for "${entry.text}", ${FAMILY_NAMES[entry.family]} · ${entry.effort} ${MARK_NAMES[mark]}.`,
        `İşaretlendi: "${entry.text}" için ${FAMILY_NAMES[entry.family]} · ${entry.effort} ${MARK_NAMES[mark]}.`,
      ),
    }
  }
  if (changed === 'reset') {
    await $.store.set('journal', [])
    await $.store.set('stats', readStats(undefined))
    state.session = emptyTotals()
    showStatus($, state)

    return { text: L('The savings counter and the log were reset.', 'tasarruf sayacı ve günlük sıfırlandı.') }
  }
  // `/gear oto` also tries again after standing down, though the mode was already auto.
  if (changed.mode === 'auto' || changed.mode !== state.settings.mode) {
    await switchMode($, state, changed.mode)
  }
  state.settings = changed
  await $.store.set('settings', changed)
  setLang(resolveLang(changed.lang, systemLocale()))
  showStatus($, state)

  const name =
    changed.mode === 'auto' ? L('on', 'açık')
    : changed.mode === 'shadow' ? L("in shadow: writes its choices down, applies nothing; the picker's model answers", 'gölgede: seçimlerini yazıyor, uygulamıyor; cevabı seçicideki model veriyor')
    : L("off (the picker's model)", 'kapalı (seçici model)')

  return { text: `${name} · ${L('profile', 'profil')} ${profileName(changed.profile)}` }
}

// A turn of the main thread ended. If it finished a piece of work and the
// conversation is large, a hand-over note is written for the band to offer.
// Nothing more: the conversation is cleared only on the person's press.
function noticeFinishedWork($: EngineInterface, state: State, answered: Family | undefined): void {
  const isWorkDone = state.isWorkDone
  state.isWorkDone = false
  if (!isWorkDone || state.settings.mode === 'pin' || !state.settings.band || state.isForking || state.handover !== undefined) {
    return
  }
  // Not awaited: the turn ends now, the note is ready a little later.
  void writeHandover($, state, answered)
}

async function writeHandover($: EngineInterface, state: State, answered: Family | undefined): Promise<void> {
  state.isForking = true
  try {
    const usage = await readUsage($)
    const tokens = usage?.context.tokens ?? 0
    if (tokens < HANDOVER_TOKENS) {
      return
    }
    await update($, handoverPendingAtom, () => true)
    const reply = await $.model.fork({ prompt: notePrompt(dayOf(await $.clock.now())) })
    if (!reply.isAnswered) {
      return
    }
    // The note is autogear's own spending, counted against what it saves.
    state.overhead += costOf(answered ?? 'opus', readTokens(reply.usage ?? {}))
    const note = cleanNote(reply.text)
    if (note === '') {
      return
    }
    state.noteSession = await $.session.id()
    await update($, handoverSizeAtom, () => tokens)
    await update($, handoverAtom, () => note)
  } catch {
    // An offer only: no note, no offer.
  } finally {
    state.isForking = false
    await update($, handoverPendingAtom, () => false)
  }
}

async function dropHandoverOffer($: EngineInterface): Promise<void> {
  await update($, handoverAtom, () => '')
  await update($, handoverArmedAtom, () => false)
}

// "temiz sohbet": the note is kept, /clear runs, and the first prompt after
// it carries the note.
async function startCleanConversation($: EngineInterface, state: State): Promise<void> {
  const note = await read($, handoverAtom)
  if (note === '' || state.handover !== undefined) {
    return
  }
  state.handover = { note, oldSessionId: state.noteSession ?? (await $.session.id()), isCleared: false }
  try {
    await $.store.set('handover', { note, oldSessionId: state.handover.oldSessionId })
    await $.command.run({ command: 'clear' })
  } catch {
    // Whether the conversation was cleared is what session.end said.
  }
  if (state.handover?.isCleared !== true) {
    state.handover = undefined
    $.ui.toast(L('autogear: the conversation could not be cleared; everything stays as it was.', 'autogear: sohbet temizlenemedi; her şey olduğu gibi duruyor.'), { timeoutMs: 10000 })

    return
  }
  // A clean conversation may start with a fresh state: the band is told again.
  await update($, handoverAtom, () => note)
  await update($, handoverArmedAtom, () => true)
  $.ui.toast(L('Clean conversation: the hand-over note will go with your first message.', 'Temiz sohbet: devir notu ilk mesajınla birlikte gidecek.'), { timeoutMs: 10000 })
}

// The note for the first prompt of the clean conversation, once.
async function takeHandover($: EngineInterface, state: State): Promise<string | undefined> {
  const handover = state.handover
  if (handover?.isCleared !== true) {
    // The person wrote on: the offer stays until they press it or close it,
    // or a newer note replaces it.
    return undefined
  }
  state.handover = undefined
  await dropHandoverOffer($)

  return handoverContext(handover.note, handover.oldSessionId)
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
    task: undefined,
    isWorkDone: false,
    isForking: false,
    noteSession: undefined,
    handover: undefined,
    ceiling: undefined,
    sent: new Map(),
    helpers: new Set(),
  }

  on('session.start', async ($, e, next) => {
    await loadSettings($, state)

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (!USER_ORIGINS.has(e.origin.kind)) {
      return next(e)
    }
    // The first prompt after "temiz sohbet" carries the hand-over note, unseen.
    const handed = e.command === undefined ? await takeHandover($, state) : undefined
    const sent = handed === undefined ? e : { ...e, context: [...(e.context ?? []), handed] }
    const said = withoutNotes(e.text)
    if (said === '') {
      // Nothing the person wrote (a bare attachment, or only a note): the turn
      // carries on with the last choice.
      state.pending = undefined

      return next(sent)
    }
    const parsed = parseOverrides(said)
    state.pending = { text: parsed.text, rule: readPrompt(state, parsed, (e.attachments?.length ?? 0) > 0) }

    // The text the model gets is the person's, with any leading +token taken off.
    return parsed.tokens.length === 0 ? next(sent) : next({ ...sent, text: withoutTokens(e.text, said, parsed.text) })
  }).catch(($, e, next) => next(e))

  // A /clear: the one autogear ran on the person's press, or theirs, after
  // which an offer for the old conversation no longer stands.
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      state.isWorkDone = false
      if (state.handover !== undefined && !state.handover.isCleared) {
        state.handover = { ...state.handover, oldSessionId: e.resume.id, isCleared: true }
      } else {
        await dropHandoverOffer($)
      }
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // Every request of a turn goes out on the turn's one model: a switch inside
  // a turn would drop the cache and the thinking the turn has built up.
  on('turn.step', async function* ($, e, next) {
    // A helper's model is told beside the answer; its requests go as they are.
    if (e.agentId !== undefined) {
      state.helpers.add(displayModel(e.model))

      return yield* next(e)
    }
    if (e.index === 0) {
      state.helpers.clear()
    }
    // In shadow mode the choice is made and kept for the log; the request goes as the picker says.
    if (state.settings.mode === 'shadow') {
      if (e.index === 0 && !state.decisions.has(e.turnId)) {
        const decision = await decideTurn($, state, e)
        if (decision !== undefined) {
          state.decisions.set(e.turnId, { ...decision, isShadow: true })
        }
      }
      markSent(state, e.turnId, e.model, e.effort)

      return yield* next(e)
    }
    if (!isRouting(state)) {
      noticeCeiling($, state, e.model, asEffort(e.effort))
      markSent(state, e.turnId, e.model, e.effort)

      return yield* next(e)
    }
    const decision = state.decisions.get(e.turnId) ?? (e.index === 0 ? await decideTurn($, state, e) : undefined)
    if (decision === undefined) {
      markSent(state, e.turnId, e.model, e.effort)

      return yield* next(e)
    }
    const model = familyOf(e.model) === decision.family ? e.model : MODEL_IDS[decision.family]
    if (model === e.model && decision.effort === e.effort) {
      markSent(state, e.turnId, e.model, e.effort)

      return yield* next(e)
    }
    markSent(state, e.turnId, model, decision.effort)

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
    markSent(state, e.turnId, e.model, e.effort)

    return yield* next(e)
  })

  // The engine tells the model it is in plan mode with a note of its own,
  // stored before the turn's first request reads the conversation; another
  // note says plan mode has ended. A subagent's notes are its own.
  on('session.append', { door: 'attachment' }, async ($, e, next) => {
    const name = e.message.name
    if (e.agentId === undefined && (name === 'plan_mode' || name === 'plan_mode_reentry' || name === 'plan_mode_exit')) {
      await update($, planningAtom, () => name !== 'plan_mode_exit')
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId === undefined && CHECK_COMMAND.test(e.command)) {
      state.lastCheckFailed = ran.isError === true
    }
    if (e.agentId === undefined && isWorkDone(e.command, ran.isError === true)) {
      state.isWorkDone = true
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      noticeFinishedWork($, state, familyOf(e.usage?.model))
    }
    if (e.agentId !== undefined) {
      return result
    }
    const decision = state.decisions.get(e.turnId)
    if (decision?.isShadow === true) {
      await afterShadowTurn($, state, decision, e.usage)
    } else if (decision !== undefined) {
      await afterTurn($, state, decision, e.usage)
    }
    // Under every answer, autogear on, in shadow or off: which model answered.
    const line = state.settings.footer ? answerLine(state, e.turnId, e.usage, decision) : undefined
    state.helpers.clear()

    return line === undefined ? result : { ...result, text: line }
  })

  // A small row above the prompt: a badge in the state's color whose dot
  // moves a little to say what autogear is doing, the last choice beside it,
  // and a button for each other state named for what it does, so a press
  // never does what the row did not say. The terminal draws the badge as
  // colored Text; a desktop draws it as an Svg in an interactive frame, where
  // its motion runs (none for a person who asked for less motion).
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !state.settings.band) {
      return next(e)
    }
    const mode = await read($, modeAtom)
    const isWorking = mode === 'auto' || mode === 'shadow'
    // The band keeps the warning's head ("5 saatlik limit %93"); the line under
    // the answer and /gear say the rest.
    const warning = isWorking ? (await read($, warningAtom)).split(':')[0] : ''
    const last = isWorking ? await read($, noteAtom) : ''
    const note = last === '' ? modeNote(mode) : last
    const actions = MODE_ACTIONS.filter(action => action.mode !== mode)
    // Stood down, "turn on" tries again.
    const label = (action: (typeof MODE_ACTIONS)[number]): string => actionLabel(action.mode, mode)
    // A second line while a hand-over note is offered or on its way.
    const handover = await read($, handoverAtom)
    const isArmed = await read($, handoverArmedAtom)
    const isPending = await read($, handoverPendingAtom)
    const offer =
      isPending && !isArmed ? L('Preparing the hand-over note…', 'Devir notu hazırlanıyor…')
      : handover === '' ? undefined
      : isArmed ? L('Clean conversation: the hand-over note will go with your first message', 'Temiz sohbet: devir notu ilk mesajınla gidecek')
      : L(
          `Hand-over note ready · conversation ${Math.round((await read($, handoverSizeAtom)) / 1000)}K tokens`,
          `Devir notu hazır · sohbet ${Math.round((await read($, handoverSizeAtom)) / 1000)} bin token`,
        )
    const hasNote = handover !== '' && !(isPending && !isArmed)
    const showNote = () => $.ui.open({ id: HANDOVER_PANE, title: L('Hand-over note', 'Devir notu') })

    if (e.surface === 'terminal') {
      const { Box, Button, Text } = $.ui.resolve(e)
      const row = (
        <Box>
          <Text dimColor>⚙ autogear </Text>
          <Text backgroundColor={BADGE_COLORS[mode]} color="#ffffff" bold>
            {` ${mode === 'pin' ? '○' : '●'} ${BADGE_NAMES[mode]} `}
          </Text>
          <Text dimColor> {note} </Text>
          {warning !== '' && <Text color="warning">⚠ {warning} </Text>}
          {actions.map(action => (
            <Button key={action.key} dimColor label={label(action)} onPress={() => switchMode($, state, action.mode)} />
          ))}
        </Box>
      )
      if (offer === undefined) {
        return row
      }

      return (
        <Box flexDirection="column">
          {row}
          <Box>
            <Text dimColor>{offer} </Text>
            {hasNote && !isArmed && <Button key="handover-clear" label={L('clean conversation', 'temiz sohbet')} onPress={() => startCleanConversation($, state)} />}
            {hasNote && <Button key="handover-show" dimColor label={L('see note', 'notu gör')} onPress={showNote} />}
            {hasNote && !isArmed && <Button key="handover-dismiss" dimColor label="×" onPress={() => dropHandoverOffer($)} />}
          </Box>
        </Box>
      )
    }
    const { Box, Button, Svg, Text } = $.ui.resolve(e)
    const row = (
      <Box alignItems="center" columnGap={1}>
        <Text dimColor>⚙ autogear</Text>
        <Box flexShrink={0}>
          <Svg source={badgeSvg(mode)} alt={`autogear: ${modeName(mode)}`} width={badgeWidth(mode)} height={BADGE_HEIGHT} isInteractive />
        </Box>
        <Text dimColor>{note}</Text>
        {warning !== '' && <Text color="warning">⚠ {warning}</Text>}
        {actions.map(action => (
          <Button key={action.key} dimColor label={label(action)} onPress={() => switchMode($, state, action.mode)} />
        ))}
      </Box>
    )
    if (offer === undefined) {
      return row
    }

    return (
      <Box flexDirection="column">
        {row}
        <Box alignItems="center" columnGap={1}>
          <Text dimColor>{offer}</Text>
          {hasNote && !isArmed && <Button key="handover-clear" label={L('clean conversation', 'temiz sohbet')} onPress={() => startCleanConversation($, state)} />}
          {hasNote && <Button key="handover-show" dimColor label={L('see note', 'notu gör')} onPress={showNote} />}
          {hasNote && !isArmed && <Button key="handover-dismiss" dimColor label="×" onPress={() => dropHandoverOffer($)} />}
        </Box>
      </Box>
    )
  })

  // The hand-over note in full, opened only by the person's "notu gör".
  on('ui.render', { component: 'Pane', requestId: HANDOVER_PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const note = await read($, handoverAtom)
    const from = state.handover?.oldSessionId ?? state.noteSession
    const lines = note === '' ? [L('There is no hand-over note right now.', 'Şu an devir notu yok.')] : [...note.split('\n'),...(from === undefined ? [] : [resumeLine(from)])]

    return (
      <Box flexDirection="column">
        {lines.map((line, index) => (
          <Text key={`line-${index}`}>{line}</Text>
        ))}
        <Button key="handover-close" dimColor label={L('close', 'kapat')} onPress={() => $.ui.close({ id: HANDOVER_PANE })} />
      </Box>
    )
  })

  // `/gear savings` is drawn as a card; its text stays what the model reads.
  on('ui.render', { component: 'CommandOutput', props: { command: 'gear' } }, async ($, e, next) => {
    const [verb = '', value = ''] = normalize(e.props.args).trim().split(/\s+/)
    if (e.props.isErrored || applyCommand(state.settings, verb, value) !== 'savings') {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    const stats = readStats(await $.store.get('stats'))
    const limits: LimitRow[] = state.limits.map(limit => ({
      name: limitTitle(limit.kind),
      percentUsed: limit.percentUsed,
      resetsAt: limit.resetsAt === undefined ? '' : `${L('resets', 'sıfırlanma')} ${clock(limit.resetsAt)}`,
    }))

    return savingsCard({ Box, Text }, { session: state.session, all: stats, since: stats.since, limits, columns: e.viewport?.columns ?? 80 })
  })

  on('command.run', { command: 'gear' }, ($, e) => runCommand($, state, e.args))
}
