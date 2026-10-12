import type { On } from 'claude-code'
import { expect, mock, test, type Engine } from 'claude-code/testing'

import { SWITCH_HEIGHT, SWITCH_OFF, SWITCH_ON, SWITCH_WIDTH } from '../hooks/core/switch'

type Sent = { model: string; effort: unknown }

type World = { sent: Sent[]; prompts: string[] }

type WorldOptions = {
  // What Haiku answers when the rules ask it.
  classifierReply?: string
  // A model id the API gives no answer for.
  silentModel?: string
  // Whether test and build commands fail.
  checksFail?: boolean
}

const NOW = Date.parse('2026-10-11T12:00:00Z')

const ZERO = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

// The engine beneath the plugin: a model that records what it was sent, and
// the usage, classifier, tools, store, clock and screen the router touches.
function world(on: On, { classifierReply = 'T1', silentModel, checksFail = false }: WorldOptions = {}): World {
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
  on('session.usage', () => ({ value: { startedAt: NOW, context: { window: 1_000_000, tokens: 2_000 }, rateLimits: [] } }))
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
  expect(sent[0]).toEqual({ model: 'claude-opus-5-5', effort: 'medium' })
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

test('the band switches gearbox off and on, and off means the picker model', async ($, on) => {
  const { sent } = world(on)
  const BAND = { plugin: 'gearbox', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10 } } as const
  for (const surface of ['terminal', 'desktop'] as const) {
    sent.length = 0
    await $.command.run({ command: 'gear', args: 'oto' })
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /açık/ })).toBeDefined()
    await ui.press({ key: 'toggle' })
    expect(await ui.find({ type: 'Text', text: /kapalı/ })).toBeDefined()
    await say($, 'bu fonksiyon ne yapıyor?')
    await step($, `off-${surface}`, 0, 'claude-opus-5-5', 'max')
    expect(sent[0]).toEqual({ model: 'claude-opus-5-5', effort: 'max' })
    await ui.press({ key: 'toggle' })
    expect(await ui.find({ type: 'Text', text: /açık/ })).toBeDefined()
    await say($, 'bu fonksiyon ne yapıyor?')
    await step($, `on-${surface}`, 0, 'claude-opus-5-5', 'max')
    expect(sent[1]?.model).toBe('claude-haiku-5-5')
    await ui.unmount()
  }
})

test('the switch is an Svg under a blank Button on the desktop and colored Text on the terminal', async ($, on) => {
  world(on)
  const BAND = { plugin: 'gearbox', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10 } } as const
  await $.command.run({ command: 'gear', args: 'oto' })

  const desktop = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const green = await desktop.find({ type: 'Svg' })
  expect(green?.props).toMatchObject({ alt: 'gearbox: açık', width: SWITCH_WIDTH, height: SWITCH_HEIGHT })
  expect(green?.props.source).toContain(SWITCH_ON)
  expect(await desktop.find({ type: 'Button', key: 'toggle' })).toBeDefined()
  await desktop.press({ key: 'toggle' })
  const gray = await desktop.find({ type: 'Svg' })
  expect(gray?.props).toMatchObject({ alt: 'gearbox: kapalı' })
  expect(gray?.props.source).toContain(SWITCH_OFF)
  await desktop.unmount()

  // The desktop's press turned gearbox off: the terminal draws the same state.
  const terminal = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await terminal.find({ type: 'Svg' })).toBeUndefined()
  expect(await terminal.find({ type: 'Text', text: /OFF/ })).toBeDefined()
  await terminal.press({ key: 'toggle' })
  expect(await terminal.find({ type: 'Text', text: /ON/ })).toBeDefined()
  await terminal.unmount()
})
