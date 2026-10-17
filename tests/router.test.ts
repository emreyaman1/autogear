import type { On } from 'claude-code'
import { expect, mock, test, type Engine } from 'claude-code/testing'

import { BADGE_COLORS, BADGE_HEIGHT, badgeWidth } from '../hooks/core/switch'
import { setLang } from '../hooks/core/text'

// The tests read gearbox's Turkish; the English is tested by switching to it.
Object.assign(globalThis, { GEARBOX_LANG: 'tr' })
setLang('tr')

type Sent = { model: string; effort: unknown }

type World = { sent: Sent[]; prompts: string[] }

type WorldOptions = {
  // What Haiku answers when the rules ask it.
  classifierReply?: string
  // A model id the API gives no answer for.
  silentModel?: string
  // Whether test and build commands fail.
  checksFail?: boolean
  // The conversation's size, as the usage reports it.
  contextTokens?: number
  // The rate-limit windows, as the usage reports them.
  rateLimits?: { kind: string; percentUsed: number; resetsAt?: string }[]
}

const NOW = Date.parse('2026-10-11T12:00:00Z')

const ZERO = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

// The engine beneath the plugin: a model that records what it was sent, and
// the usage, classifier, tools, store, clock and screen the router touches.
function world(on: On, { classifierReply = 'T1', silentModel, checksFail = false, contextTokens = 2_000, rateLimits = [] }: WorldOptions = {}): World {
  const seen: World = { sent: [], prompts: [] }
  mock.store(on)
  mock.clock(on, { now: NOW })
  on('prompt.submit', ($, e) => {
    seen.prompts.push(e.text)

    return { text: e.text }
  })
  on('turn.step', async function* ($, e) {
    seen.sent.push({ model: e.model, effort: e.effort })
    const isSilent = e.model === silentModel

    return { turnId: e.turnId, index: e.index, answer: isSilent ? '' : 'tamam', toolUses: [], stopReason: isSilent ? null : 'end_turn', usage: null }
  })
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('tool.call', () => (checksFail ? { isError: true, result: '3 tests failed', text: '3 tests failed' } : { result: 'ok' }))
  // Calls on `$` are answered `{ value }`.
  on('session.usage', () => ({ value: { startedAt: NOW, context: { window: 1_000_000, tokens: contextTokens }, rateLimits } }))
  on('model.complete', () => ({ value: { isAnswered: true, text: classifierReply, usage: ZERO } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))

  return seen
}

async function step($: Engine, turnId: string, index = 0, model = 'claude-opus-5-5', effort: 'high' | 'max' = 'high') {
  const stream = $.turn.step({ turnId, index, model, effort, messageCount: 1 + index })
  for await (const _chunk of stream) {
    // Drained only to reach the result.
  }

  return stream.result
}

async function say($: Engine, text: string): Promise<void> {
  await $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
}

async function finish($: Engine, turnId: string, answeredBy: string): Promise<void> {
  await $.turn.complete({ turnId, answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage: { model: answeredBy, ...ZERO } })
}

test('a trivial question goes to Haiku at low effort', async ($, on) => {
  const { sent } = world(on)
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't1')
  expect(sent[0]).toEqual({ model: 'claude-haiku-5-5', effort: 'low' })
})

test('a hard request stays under a Sonnet picker', async ($, on) => {
  const { sent } = world(on)
  await say($, 'bu mimariyi neden böyle kurduk, alternatifleri karşılaştır')
  await step($, 't1', 0, 'claude-sonnet-5-5', 'high')
  expect(sent[0]).toEqual({ model: 'claude-sonnet-5-5', effort: 'high' })
})

test('the rules ask Haiku when they cannot tell', async ($, on) => {
  const { sent } = world(on, { classifierReply: 'T3' })
  await say($, 'şu fonksiyonu düzelt')
  await step($, 't1')
  expect(sent[0]).toEqual({ model: 'claude-sonnet-5-5', effort: 'high' })
})

test('every request of a turn goes out on the same model', async ($, on) => {
  const { sent } = world(on)
  await say($, 'commit mesajı yaz')
  await step($, 't1', 0)
  await step($, 't1', 1)
  expect(sent[1]).toEqual(sent[0])
})

test('a +opus prompt goes to Opus with the token taken off', async ($, on) => {
  const { sent, prompts } = world(on)
  await say($, '+opus bu fonksiyon ne yapıyor?')
  await step($, 't1')
  expect(prompts[0]).toBe('bu fonksiyon ne yapıyor?')
  expect(sent[0]?.model).toBe('claude-opus-5-5')
})

test('/gear sabitle leaves every request as the picker says', async ($, on) => {
  const { sent } = world(on)
  await $.command.run({ command: 'gear', args: 'sabitle' })
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't1', 0, 'claude-opus-5-5', 'max')
  expect(sent[0]).toEqual({ model: 'claude-opus-5-5', effort: 'max' })
})

test('a model that gives no answer is sent again on the picker model, then avoided', async ($, on) => {
  const { sent } = world(on, { silentModel: 'claude-haiku-5-5' })
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't1')
  expect(sent.map(one => one.model)).toEqual(['claude-haiku-5-5', 'claude-opus-5-5'])
  await say($, 'bu sınıf ne yapıyor?')
  await step($, 't2')
  expect(sent[2]).toEqual({ model: 'claude-sonnet-5-5', effort: 'low' })
})

test('gearbox stands down when its choices stop taking effect', async ($, on) => {
  const { sent } = world(on)
  for (const turnId of ['t1', 't2', 't3']) {
    await say($, 'bu fonksiyon ne yapıyor?')
    await step($, turnId)
    await finish($, turnId, 'claude-opus-5-5')
  }
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't4')
  expect(sent[3]).toEqual({ model: 'claude-opus-5-5', effort: 'high' })
  await $.command.run({ command: 'gear', args: 'oto' })
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't5')
  expect(sent[4]?.model).toBe('claude-haiku-5-5')
})

test('a turn that ends with failing tests hands the next one a stronger model', async ($, on) => {
  const { sent } = world(on, { checksFail: true })
  await say($, 'commit mesajı yaz')
  await step($, 't1')
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  await finish($, 't1', 'claude-haiku-5-5')
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't2')
  expect(sent[1]).toEqual({ model: 'claude-sonnet-5-5', effort: 'medium' })
})

test('a bug told without detail goes to Sonnet at high in tasarruf, and a go-ahead in its middle keeps it there', async ($, on) => {
  const { sent } = world(on)
  await say($, 'bu çalışmıyor, düzelt')
  await step($, 't1', 0, 'claude-opus-5-5', 'max')
  expect(sent[0]).toEqual({ model: 'claude-sonnet-5-5', effort: 'high' })
  const done = await $.turn.complete({ turnId: 't1', answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage: { model: 'claude-sonnet-5-5', ...ZERO } })
  expect(done.text).toBe('*Sonnet 5.5 · efor high*')
  // The reading behind the choice is in the status, not under the answer.
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: '' }))).toContain('belirsiz anlatılmış hata')
  await say($, 'evet, devam et')
  await step($, 't2', 0, 'claude-opus-5-5', 'max')
  expect(sent[1]).toEqual({ model: 'claude-sonnet-5-5', effort: 'high' })
})

test('a bug whose cause hides but is told plainly goes to Sonnet at high', async ($, on) => {
  const { sent } = world(on)
  await say($, 'uygulama bazen donuyor, neden olduğunu bul')
  await step($, 't1', 0, 'claude-opus-5-5', 'max')
  expect(sent[0]).toEqual({ model: 'claude-sonnet-5-5', effort: 'high' })
  const done = await $.turn.complete({ turnId: 't1', answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage: { model: 'claude-sonnet-5-5', ...ZERO } })
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: '' }))).toContain('yeri belli hata avı: Sonnet')
})

test('a nearly full window keeps critical work on Opus and warns under the answer and in the band', async ($, on) => {
  const resetsAt = new Date(NOW + 2 * 3_600_000).toISOString()
  const { sent } = world(on, { rateLimits: [{ kind: 'five_hour', percentUsed: 92, resetsAt }] })
  const BAND = { plugin: 'gearbox', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10 } } as const
  await say($, "uygulamayı Express'ten NestJS'e taşı, tüm route'ları, middleware'leri ve testleri güncelle")
  await step($, 't1', 0, 'claude-opus-5-5', 'high')
  expect(sent[0]).toEqual({ model: 'claude-opus-5-5', effort: 'high' })
  const done = await $.turn.complete({ turnId: 't1', answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage: { model: 'claude-opus-5-5', ...ZERO } })
  expect(done.text).toContain('⚠ 5 saatlik limit %92: bu iş Opus 5.5 · high ile yapılıyor, limit dolabilir')
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /5 saatlik limit %92/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /bu iş Opus/ })).toBeUndefined()
    await ui.unmount()
  }
  // Off, gearbox reads no windows, and the band says nothing of them.
  await $.command.run({ command: 'gear', args: 'sabitle' })
  const off = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await off.find({ type: 'Text', text: /limit/ })).toBeUndefined()
  await off.unmount()
})

// The state a mounted band shows: the desktop badge's alt, or the terminal badge's name.
async function badgeOf(ui: Awaited<ReturnType<Engine['ui']['mount']>>, surface: 'terminal' | 'desktop'): Promise<string | undefined> {
  if (surface === 'desktop') {
    return (await ui.find({ type: 'Svg' }))?.props.alt as string | undefined
  }
  for (const [name, state] of [['AÇIK', 'açık'], ['GÖLGE', 'gölge'], ['KAPALI', 'kapalı'], ['DURDU', 'durdu']] as const) {
    if ((await ui.find({ type: 'Text', text: new RegExp(` ${name} $`) })) !== undefined) {
      return `gearbox: ${state}`
    }
  }

  return undefined
}

test('the band shows on, shadow and off apart, and each button does what it is named for', async ($, on) => {
  const { sent } = world(on)
  const BAND = { plugin: 'gearbox', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10 } } as const
  for (const surface of ['terminal', 'desktop'] as const) {
    sent.length = 0
    await $.command.run({ command: 'gear', args: 'oto' })
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await badgeOf(ui, surface)).toBe('gearbox: açık')
    // On: the buttons offer shadow and off, not on.
    expect(await ui.find({ type: 'Button', key: 'to-auto' })).toBeUndefined()
    expect(await ui.find({ type: 'Button', key: 'to-shadow', text: 'gölgeye al' })).toBeDefined()

    await ui.press({ key: 'to-shadow' })
    expect(await badgeOf(ui, surface)).toBe('gearbox: gölge')
    expect(await ui.find({ type: 'Button', key: 'to-shadow' })).toBeUndefined()
    await say($, 'bu fonksiyon ne yapıyor?')
    await step($, `shadow-${surface}`, 0, 'claude-opus-5-5', 'max')
    expect(sent[0]).toEqual({ model: 'claude-opus-5-5', effort: 'max' })

    // From shadow, "kapat" turns it off; it does not turn routing on.
    await ui.press({ key: 'to-pin' })
    expect(await badgeOf(ui, surface)).toBe('gearbox: kapalı')
    expect(await ui.find({ type: 'Text', text: /seçicideki model kullanılıyor/ })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'to-auto', text: 'aç' })).toBeDefined()
    await say($, 'bu fonksiyon ne yapıyor?')
    await step($, `off-${surface}`, 0, 'claude-opus-5-5', 'max')
    expect(sent[1]).toEqual({ model: 'claude-opus-5-5', effort: 'max' })

    await ui.press({ key: 'to-auto' })
    expect(await badgeOf(ui, surface)).toBe('gearbox: açık')
    await say($, 'bu fonksiyon ne yapıyor?')
    await step($, `on-${surface}`, 0, 'claude-opus-5-5', 'max')
    expect(sent[2]?.model).toBe('claude-haiku-5-5')
    // The last choice stands beside the badge.
    expect(await ui.find({ type: 'Text', text: /^Haiku · low · T0 önemsiz$|Haiku · low · T0 önemsiz/ })).toBeDefined()
    await ui.unmount()
  }
})

test('the state is an Svg badge on the desktop and colored Text on the terminal, the same on both', async ($, on) => {
  world(on)
  const BAND = { plugin: 'gearbox', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10 } } as const
  await $.command.run({ command: 'gear', args: 'golge' })

  const desktop = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const badge = await desktop.find({ type: 'Svg' })
  expect(badge?.props).toMatchObject({ alt: 'gearbox: gölge', width: badgeWidth('shadow'), height: BADGE_HEIGHT, isInteractive: true })
  expect(badge?.props.source).toContain(BADGE_COLORS.shadow)
  expect(badge?.props.source).toContain('>GÖLGE</text>')
  await desktop.press({ key: 'to-pin' })
  const off = await desktop.find({ type: 'Svg' })
  expect(off?.props).toMatchObject({ alt: 'gearbox: kapalı' })
  expect(off?.props.source).toContain(BADGE_COLORS.pin)
  await desktop.unmount()

  // The desktop's press turned gearbox off: the terminal draws the same state.
  const terminal = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await terminal.find({ type: 'Svg' })).toBeUndefined()
  expect(await terminal.find({ type: 'Text', text: /KAPALI/ })).toBeDefined()
  await terminal.press({ key: 'to-auto' })
  expect(await terminal.find({ type: 'Text', text: /AÇIK/ })).toBeDefined()
  await terminal.unmount()
})

test('stood down, the band says so, offers to try again, and a state picked by hand shows as picked', async ($, on) => {
  const { sent } = world(on)
  const BAND = { plugin: 'gearbox', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10 } } as const
  for (const turnId of ['t1', 't2', 't3']) {
    await say($, 'bu fonksiyon ne yapıyor?')
    await step($, turnId)
    await finish($, turnId, 'claude-opus-5-5')
  }
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Svg' }))?.props).toMatchObject({ alt: 'gearbox: durdu' })
  expect(await ui.find({ type: 'Button', key: 'to-auto', text: 'yeniden dene' })).toBeDefined()
  await ui.press({ key: 'to-shadow' })
  expect((await ui.find({ type: 'Svg' }))?.props).toMatchObject({ alt: 'gearbox: gölge' })
  await ui.press({ key: 'to-auto' })
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't4')
  expect(sent.at(-1)?.model).toBe('claude-haiku-5-5')
  await ui.unmount()
})

test('a turn answered by Haiku shows its cost and the saving against the picker, and /gear tasarruf adds it up', async ($, on) => {
  world(on)
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't1')
  const usage = { model: 'claude-haiku-5-5', input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 40_000, cache_creation_input_tokens: 2000 }
  const done = await $.turn.complete({ turnId: 't1', answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage })
  // Haiku: $0.0001 + $0.00025 + $0.0004 + $0.00025; Opus: $0.004 + $0.01 + $0.008 + $0.01.
  expect(done.text).toBe('*Haiku 5.5 · efor low*')
  const report = await $.command.run({ command: 'gear', args: 'tasarruf' })
  expect(JSON.stringify(report)).toContain('| Harcama | $0,0010 | $0,0010 |')
  expect(JSON.stringify(report)).toContain('| Seçici modeliyle | $0,032 | $0,032 |')
  expect(JSON.stringify(report)).toContain('| Tasarruf | **$0,031** (%97) |')
  await $.command.run({ command: 'gear', args: 'sifirla' })
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'tasarruf' }))).toContain('Henüz kayıtlı tur yok')
})

test('a turn that switched model counts its rewritten cache against gearbox', async ($, on) => {
  world(on)
  const turn = async (id: string, model: string, text: string) => {
    await say($, text)
    await step($, id)
    const usage = { model, input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 100_000 }

    return $.turn.complete({ turnId: id, answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage })
  }
  await turn('t1', 'claude-opus-5-5', 'bu mimariyi neden böyle kurduk, alternatifleri karşılaştır')
  // Opus took the first turn; the second goes to Haiku, which writes the cache afresh.
  const second = await turn('t2', 'claude-haiku-5-5', 'bu fonksiyon ne yapıyor?')
  expect(second.text).toContain('*Haiku 5.5 · efor')
  // Haiku writes 100K at $0.125/M = $0.0125; the picker's Opus would have read 100K at $0.20/M = $0.02.
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'tasarruf' }))).toContain('| Haiku | 1 (%50) | $0,013 | $0,020 |')
})

const CARD = { plugin: 'gearbox', component: 'CommandOutput', props: { command: 'gear', args: 'tasarruf', text: '', isErrored: false } } as const

async function turnOn($: Engine, id: string, text: string, model: string, tokens: { read: number; write: number; output: number }) {
  await say($, text)
  await step($, id)
  const usage = { model, input_tokens: 100, output_tokens: tokens.output, cache_read_input_tokens: tokens.read, cache_creation_input_tokens: tokens.write }
  await $.turn.complete({ turnId: id, answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage })
}

test('/gear tasarruf is drawn as a card of the session, the total, the models and the table', async ($, on) => {
  world(on)
  await turnOn($, 't1', 'bu fonksiyon ne yapıyor?', 'claude-haiku-5-5', { read: 40_000, write: 2000, output: 500 })
  await turnOn($, 't2', 'bu mimariyi neden böyle kurduk, alternatifleri karşılaştır', 'claude-opus-5-5', { read: 90_000, write: 8000, output: 3000 })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...CARD, surface, viewport: { columns: 100, rows: 40 } })
    for (const text of [/Bu oturum/, /Toplam/, /Model payı/, /Haiku %50/, /Opus %50/, /Döküm/, /Önbellek okuma/, /Seçici modeliyle/, /\/gear sifirla/]) {
      expect(await ui.find({ type: 'Text', text })).toBeDefined()
    }
    expect(await ui.find({ type: 'Box', borderStyle: 'round' })).toBeDefined()
    await ui.unmount()
  }
})

test('the card falls back to a line per model on a narrow screen, and says so when there is nothing yet', async ($, on) => {
  world(on)
  const empty = await $.ui.mount({ ...CARD, surface: 'desktop' })
  expect(await empty.find({ type: 'Text', text: /Henüz kayıtlı tur yok/ })).toBeDefined()
  await empty.unmount()

  await turnOn($, 't1', 'bu fonksiyon ne yapıyor?', 'claude-haiku-5-5', { read: 40_000, write: 2000, output: 500 })
  await turnOn($, 't2', 'bu sınıf ne yapıyor?', 'claude-sonnet-5-5', { read: 40_000, write: 2000, output: 500 })
  await turnOn($, 't3', 'bu modül ne yapıyor?', 'claude-opus-5-5', { read: 40_000, write: 2000, output: 500 })
  const wide = await $.ui.mount({ ...CARD, surface: 'terminal', viewport: { columns: 100, rows: 30 } })
  expect(await wide.find({ type: 'Text', text: /Girdi/ })).toBeDefined()
  await wide.unmount()
  const narrow = await $.ui.mount({ ...CARD, surface: 'terminal', viewport: { columns: 40, rows: 30 } })
  expect(await narrow.find({ type: 'Text', text: /1 tur · \$0,00/ })).toBeDefined()
  expect(await narrow.find({ type: 'Text', text: /Girdi/ })).toBeUndefined()
  await narrow.unmount()
})

test('other /gear output is left to the engine', async ($, on) => {
  world(on)
  on('ui.render', ($, e) => $.ui.resolve(e).Text({ children: 'engine row' }))
  const status = await $.ui.mount({ ...CARD, props: { ...CARD.props, args: '' }, surface: 'desktop' })
  expect(await status.find({ type: 'Text', text: /engine row/ })).toBeDefined()
  expect(await status.find({ type: 'Box', borderStyle: 'round' })).toBeUndefined()
  await status.unmount()
})

test('every decision is logged, a complaint flags the answer before it, and a mark lands on the latest', async ($, on) => {
  world(on)
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'kayit' }))).toContain('Henüz kayıtlı karar yok')
  await turnOn($, 't1', 'bu fonksiyon ne yapıyor?', 'claude-haiku-5-5', { read: 1000, write: 100, output: 50 })
  await turnOn($, 't2', 'olmadı, hâlâ aynı hata', 'claude-sonnet-5-5', { read: 1000, write: 100, output: 50 })
  const report = JSON.stringify(await $.command.run({ command: 'gear', args: 'kayit' }))
  expect(report).toContain('bu fonksiyon ne yapıyor?')
  expect(report).toContain('şikâyetle yükseltildi')
  const marked = JSON.stringify(await $.command.run({ command: 'gear', args: 'yanlis fazla' }))
  expect(marked).toContain('gereğinden güçlüydü')
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'kayit' }))).toContain('siz: gereğinden güçlüydü')
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'yanlis' }))).toContain('Kullanım')
  await $.command.run({ command: 'gear', args: 'sifirla' })
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'kayit' }))).toContain('Henüz kayıtlı karar yok')
})

test('a system note ahead of the message is not classified: a plain greeting stays trivial', async ($, on) => {
  // Were the note read, Haiku's T4 would win; a greeting needs no question.
  const { sent } = world(on, { classifierReply: 'T4' })
  await say($, '<system-reminder>\nThe user started this session without choosing a project folder, so your working directory is a scratch workspace the app created for it. Claude Code is installed; the session model is Opus 5.5.\n</system-reminder>\nmerhaba')
  await step($, 't1')
  expect(sent[0]).toEqual({ model: 'claude-haiku-5-5', effort: 'low' })
})

test('a message that is only a system note carries on with the last choice', async ($, on) => {
  const { sent } = world(on)
  await say($, 'bu mimariyi neden böyle kurduk, alternatifleri karşılaştır')
  await step($, 't1', 0, 'claude-opus-5-5', 'high')
  await finish($, 't1', 'claude-opus-5-5')
  await say($, '<system-reminder>Claude Code bildirimi: yeni sürüm hazır.</system-reminder>')
  await step($, 't2', 0, 'claude-opus-5-5', 'high')
  expect(sent[1]?.model).toBe(sent[0]?.model)
})

test('a model asked for in words is used, above the picker included', async ($, on) => {
  const { sent } = world(on)
  await say($, 'istediğim şeyi yapmamışsın, bu görevi sonnete maxa verir misin')
  await step($, 't1', 0, 'claude-opus-5-5', 'high')
  expect(sent[0]).toEqual({ model: 'claude-sonnet-5-5', effort: 'max' })
  await finish($, 't1', 'claude-sonnet-5-5')
  await say($, 'haiku low ile yaptı ve o modele güvenmiyorum, opus sende göz gezdirip anlatır mısın')
  await step($, 't2', 0, 'claude-opus-5-5', 'high')
  expect(sent[1]?.model).toBe('claude-opus-5-5')
})

test('a remark Haiku calls trivial, in the middle of hard work, stays one tier below the work', async ($, on) => {
  const { sent } = world(on, { classifierReply: 'T0' })
  await say($, 'bu mimariyi neden böyle kurduk, alternatifleri karşılaştır')
  await step($, 't1')
  await finish($, 't1', 'claude-opus-5-5')
  await say($, 'bilgin olsun, bunu akşama kadar bitirmek istiyorum ama acelem yok')
  await step($, 't2')
  expect(sent[1]?.model).toBe('claude-sonnet-5-5')
  await finish($, 't2', 'claude-sonnet-5-5')
  // A chore the rules are sure of is new work of its own.
  await say($, 'commit et')
  await step($, 't3')
  expect(sent[2]?.model).toBe('claude-haiku-5-5')
})

test('a warm cache never keeps harder work on Haiku', async ($, on) => {
  const { sent } = world(on, { contextTokens: 60_000 })
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't1')
  await finish($, 't1', 'claude-haiku-5-5')
  await say($, 'butonun rengini kırmızı yap')
  await step($, 't2')
  expect(sent[1]).toEqual({ model: 'claude-sonnet-5-5', effort: 'medium' })
})

test('a commit in a large conversation on Opus stays on Opus at low effort, the cache kept', async ($, on) => {
  const { sent } = world(on, { contextTokens: 150_000 })
  await say($, "uygulamayı Express'ten NestJS'e taşı, tüm route'ları, middleware'leri ve testleri güncelle")
  await step($, 't1', 0, 'claude-opus-5-5', 'high')
  expect(sent[0]).toEqual({ model: 'claude-opus-5-5', effort: 'high' })
  await finish($, 't1', 'claude-opus-5-5')
  await say($, 'commit et')
  await step($, 't2', 0, 'claude-opus-5-5', 'high')
  expect(sent[1]).toEqual({ model: 'claude-opus-5-5', effort: 'low' })
})

test('a message with nothing written (a bare image) carries on with the last choice', async ($, on) => {
  const { sent } = world(on, { classifierReply: 'T0' })
  await say($, 'bu mimariyi neden böyle kurduk, alternatifleri karşılaştır')
  await step($, 't1')
  await finish($, 't1', 'claude-opus-5-5')
  await say($, '')
  await step($, 't2')
  expect(sent[1]).toEqual(sent[0])
})

test('a +token after a system note is taken off, the note left for the model', async ($, on) => {
  const { sent, prompts } = world(on)
  await say($, '<system-reminder>\nscratch workspace\n</system-reminder>\n+haiku bu dosyada ne var?')
  await step($, 't1')
  expect(sent[0]?.model).toBe('claude-haiku-5-5')
  expect(prompts[0]).toContain('<system-reminder>')
  expect(prompts[0]).not.toContain('+haiku')
  expect(prompts[0]).toContain('bu dosyada ne var?')
})

test('in shadow mode gearbox chooses and writes it down, and every request goes as the picker says', async ($, on) => {
  const { sent } = world(on)
  const shown = JSON.stringify(await $.command.run({ command: 'gear', args: 'golge' }))
  expect(shown).toContain('gölgede')
  for (const turnId of ['t1', 't2', 't3', 't4']) {
    await say($, 'bu fonksiyon ne yapıyor?')
    await step($, turnId, 0, 'claude-opus-5-5', 'high')
    const done = await $.turn.complete({ turnId, answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage: { model: 'claude-opus-5-5', ...ZERO } })
    // Under the answer only the model that answered; what gearbox would have chosen is in the log.
    expect(done.text).toBe('*Opus 5.5 · efor high*')
  }
  // Not one request was changed.
  expect(sent.every(one => one.model === 'claude-opus-5-5' && one.effort === 'high')).toBe(true)
  const log = JSON.stringify(await $.command.run({ command: 'gear', args: 'kayit' }))
  expect(log).toContain('gölge, cevap: Opus')
  expect(log).toContain('Gölgede seçilip uygulanmayan: 4')
  expect(log).toContain('Şüpheli kararlar: 0 / 4')
  // Nothing was saved, and the answers on another model are no sign of a broken API.
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'tasarruf' }))).toContain('Henüz kayıtlı tur yok')
  await $.command.run({ command: 'gear', args: 'oto' })
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't5', 0, 'claude-opus-5-5', 'high')
  expect(sent.at(-1)).toEqual({ model: 'claude-haiku-5-5', effort: 'low' })
})

test('in shadow mode under a Sonnet picker the log keeps both what gearbox wanted and what the picker allows', async ($, on) => {
  world(on)
  await $.command.run({ command: 'gear', args: 'golge' })
  await say($, "uygulamayı Express'ten NestJS'e taşı, tüm route'ları, middleware'leri ve testleri güncelle")
  await step($, 't1', 0, 'claude-sonnet-5-5', 'high')
  const done = await $.turn.complete({ turnId: 't1', answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage: { model: 'claude-sonnet-5-5', ...ZERO } })
  expect(done.text).toBe('*Sonnet 5.5 · efor high*')
  const log = JSON.stringify(await $.command.run({ command: 'gear', args: 'kayit' }))
  expect(log).toContain('Sonnet · high (tavansız Opus · high)')
  expect(log).toContain('Seçici tavanı yüzünden kırpılan: 1, bunların 1 tanesinde daha güçlü bir model istenmişti')
})

async function note($: Engine, name: string): Promise<void> {
  await $.session.append({ door: 'attachment', origin: { kind: 'engine' }, uuid: `row-${name}`, message: { type: 'attachment', name, role: 'user', isMeta: true, content: [{ type: 'text', text: name }] } })
}

test('in plan mode every request goes to Opus at an effort by the plan size, until plan mode ends', async ($, on) => {
  const { sent } = world(on)
  await note($, 'plan_mode')
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't1', 0, 'claude-opus-5-5', 'max')
  expect(sent[0]).toEqual({ model: 'claude-opus-5-5', effort: 'medium' })
  const done = await $.turn.complete({ turnId: 't1', answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage: { model: 'claude-opus-5-5', ...ZERO } })
  expect(done.text).toContain(' · plan modu')
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'kayit' }))).toContain('| plan modu |')
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: '' }))).toContain('Plan modu')
  await say($, "uygulamayı Express'ten NestJS'e taşı, tüm route'ları, middleware'leri ve testleri güncelle")
  await step($, 't2', 0, 'claude-opus-5-5', 'max')
  expect(sent[1]).toEqual({ model: 'claude-opus-5-5', effort: 'xhigh' })
  await finish($, 't2', 'claude-opus-5-5')
  await note($, 'plan_mode_exit')
  await say($, 'commit mesajı yaz')
  await step($, 't3', 0, 'claude-opus-5-5', 'max')
  expect(sent[2]).toEqual({ model: 'claude-haiku-5-5', effort: 'low' })
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: '' }))).not.toContain('Plan modu')
})

test('before a choice the band says what the state means; in shadow mode it shows what gearbox would pick', async ($, on) => {
  world(on)
  const BAND = { plugin: 'gearbox', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10 } } as const
  await $.command.run({ command: 'gear', args: 'golge' })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /seçip yazıyor, uygulamıyor/ })).toBeDefined()
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't1', 0, 'claude-opus-5-5', 'high')
  expect(await ui.find({ type: 'Text', text: /Haiku · low · T0 önemsiz önerirdi/ })).toBeDefined()
  await ui.unmount()
})

test('under every answer, even with gearbox off, the model that answered and its effort; the helpers beside it', async ($, on) => {
  world(on)
  await $.command.run({ command: 'gear', args: 'off' })
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't1', 0, 'claude-opus-5-5', 'max')
  const stream = $.turn.step({ turnId: 'h1', index: 0, model: 'claude-sonnet-5-5', effort: 'medium', messageCount: 1, agentId: 'helper-1' })
  for await (const _chunk of stream) {
    // Drained only to reach the result.
  }
  const done = await $.turn.complete({ turnId: 't1', answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage: { model: 'claude-opus-5-5', ...ZERO } })
  expect(done.text).toBe('*Opus 5.5 · efor max · yardımcılar: Sonnet 5.5*')
  // The helpers are told once: the next answer has none.
  await say($, 'bu sınıf ne yapıyor?')
  await step($, 't2', 0, 'claude-opus-5-5', 'max')
  const next = await $.turn.complete({ turnId: 't2', answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage: { model: 'claude-opus-5-5', ...ZERO } })
  expect(next.text).toBe('*Opus 5.5 · efor max*')
  // /gear note off takes the line away.
  await $.command.run({ command: 'gear', args: 'note off' })
  await say($, 'bu sınıf ne yapıyor?')
  await step($, 't3', 0, 'claude-opus-5-5', 'max')
  const quiet = await $.turn.complete({ turnId: 't3', answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage: { model: 'claude-opus-5-5', ...ZERO } })
  expect(quiet.text).toBe('tamam')
})

test('the commands are English: on, off, shadow, savings, log, wrong, reset, profile saver', async ($, on) => {
  const { sent } = world(on)
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'profile balanced' }))).toContain('profil dengeli')
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'profile saver' }))).toContain('profil tasarruf')
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'shadow' }))).toContain('gölgede')
  await $.command.run({ command: 'gear', args: 'off' })
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't1', 0, 'claude-opus-5-5', 'max')
  expect(sent[0]).toEqual({ model: 'claude-opus-5-5', effort: 'max' })
  await $.command.run({ command: 'gear', args: 'on' })
  await say($, 'bu sınıf ne yapıyor?')
  await step($, 't2', 0, 'claude-opus-5-5', 'high')
  expect(sent[1]?.model).toBe('claude-haiku-5-5')
  await $.turn.complete({ turnId: 't2', answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage: { model: 'claude-haiku-5-5', ...ZERO } })
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'wrong weak' }))).toContain('İşaretlendi')
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'log' }))).toContain('siz: çok zayıftı')
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'savings' }))).toContain('Tasarruf')
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'reset' }))).toContain('sıfırlandı')
  // The old Turkish names go on working.
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'sabitle' }))).toContain('kapalı')
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: '' }))).toContain('/gear doctor')
})

test('/gear lang en speaks English everywhere, /gear lang tr goes back', async ($, on) => {
  world(on)
  try {
    expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'lang en' }))).toContain('on')
    await say($, 'bu fonksiyon ne yapıyor?')
    await step($, 't1', 0, 'claude-opus-5-5', 'high')
    const done = await $.turn.complete({ turnId: 't1', answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage: { model: 'claude-haiku-5-5', ...ZERO } })
    expect(done.text).toBe('*Haiku 5.5 · effort low*')
    const status = JSON.stringify(await $.command.run({ command: 'gear', args: '' }))
    expect(status).toContain('Last decision')
    expect(status).toContain('(rules: question:')
    expect(status).not.toContain('Son karar')
    expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'log' }))).toContain('Doubtful decisions')
    expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'savings' }))).toContain('This session')
    expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'doctor' }))).toContain('Nothing to fix')
    await $.command.run({ command: 'gear', args: 'lang tr' })
    expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'log' }))).toContain('Şüpheli kararlar')
  } finally {
    setLang('tr')
  }
})

test('/gear doctor says what to fix and how', async ($, on) => {
  world(on)
  const before = JSON.stringify(await $.command.run({ command: 'gear', args: 'doctor' }))
  expect(before).toContain('gearbox doctor')
  expect(before).toContain('gearbox açık')
  expect(before).toContain('seçici bilinmiyor')
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't1', 0, 'claude-sonnet-5-5', 'medium')
  const held = JSON.stringify(await $.command.run({ command: 'gear', args: 'doctor' }))
  expect(held).toContain('Seçici Sonnet 5.5 · medium tutuyor')
  expect(held).toContain('Opus · high seç')
  await $.command.run({ command: 'gear', args: 'shadow' })
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'doctor' }))).toContain('`/gear on`')
  await $.command.run({ command: 'gear', args: 'off' })
  expect(JSON.stringify(await $.command.run({ command: 'gear', args: 'doctor' }))).toContain('gearbox kapalı')
})
