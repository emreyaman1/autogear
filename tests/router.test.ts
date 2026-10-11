import type { On } from 'claude-code'
import { expect, mock, test, type Engine } from 'claude-code/testing'

type Sent = { model: string; effort: unknown }

type World = { sent: Sent[]; prompts: string[] }

const NOW = Date.parse('2026-10-11T12:00:00Z')

const ZERO = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

// The engine beneath the plugin: a model that records what it was sent, and
// the usage, classifier, store, clock and screen the router reads and writes.
function world(on: On, classifierReply = 'T1'): World {
  const seen: World = { sent: [], prompts: [] }
  mock.store(on)
  mock.clock(on, { now: NOW })
  on('prompt.submit', ($, e) => {
    seen.prompts.push(e.text)

    return { text: e.text }
  })
  on('turn.step', async function* ($, e) {
    seen.sent.push({ model: e.model, effort: e.effort })

    return { turnId: e.turnId, index: e.index, answer: 'tamam', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  // Calls on `$` are answered `{ value }`.
  on('session.usage', () => ({ value: { startedAt: NOW, context: { window: 1_000_000, tokens: 2_000 }, rateLimits: [] } }))
  on('model.complete', () => ({ value: { isAnswered: true, text: classifierReply, usage: ZERO } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))

  return seen
}

async function step($: Engine, turnId: string, index: number, model = 'claude-opus-5-5', effort: 'high' | 'max' = 'high') {
  const stream = $.turn.step({ turnId, index, model, effort, messageCount: 1 + index })
  for await (const _chunk of stream) {
    // Drained only to reach the result.
  }

  return stream.result
}

async function say($: Engine, text: string): Promise<void> {
  await $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
}

test('a trivial question goes to Haiku at low effort', async ($, on) => {
  const { sent } = world(on)
  await say($, 'bu fonksiyon ne yapıyor?')
  await step($, 't1', 0)
  expect(sent[0]).toEqual({ model: 'claude-haiku-5-5', effort: 'low' })
})

test('a hard request stays under a Sonnet picker', async ($, on) => {
  const { sent } = world(on)
  await say($, 'bu mimariyi neden böyle kurduk, alternatifleri karşılaştır')
  await step($, 't1', 0, 'claude-sonnet-5-5', 'high')
  expect(sent[0]).toEqual({ model: 'claude-sonnet-5-5', effort: 'high' })
})

test('the rules ask Haiku when they cannot tell', async ($, on) => {
  const { sent } = world(on, 'T3')
  await say($, 'şu fonksiyonu düzelt')
  await step($, 't1', 0)
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
  await step($, 't1', 0)
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
