import type { On } from 'claude-code'
import { describe, expect, mock, test, type Engine } from 'claude-code/testing'

import { cleanNote, handoverContext, isWorkDone } from '../hooks/core/handover'
import { setLang } from '../hooks/core/text'

// The tests read autogear's Turkish; the English is tested by switching to it.
Object.assign(globalThis, { GEARBOX_LANG: 'tr' })
setLang('tr')

const NOW = Date.parse('2026-10-17T12:00:00Z')

const ZERO = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

const NOTE = [
  'Devir notu: autogear (17 Ekim 2026)',
  'Proje: C:\\autogear, dal main, son commit 6431f74',
  'Yapılan: adım 5 ölçüldü',
  'Açık: adım 17',
  'Kurallar: Türkçe, sade anlat',
  'Oku: docs/sonraki-adimlar.md, CLAUDE.md',
].join('\n')

const BAND = { plugin: 'autogear', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10 } } as const

type World = { forks: number; clears: number; opened: string[]; contexts: (readonly string[] | undefined)[] }

// The engine beneath autogear: a conversation of `contextTokens`, a fork that
// writes NOTE, a /clear that ends the session as the engine's does, and the
// prompts with what they carried beside them.
function world(engine: Engine, on: On, { contextTokens = 700_000 }: { contextTokens?: number } = {}): World {
  const seen: World = { forks: 0, clears: 0, opened: [], contexts: [] }
  mock.store(on)
  mock.clock(on, { now: NOW })
  on('prompt.submit', ($, e) => {
    seen.contexts.push(e.context)

    return { text: e.text, ...(e.context === undefined ? {} : { context: e.context }) }
  })
  on('turn.step', async function* ($, e) {
    return { turnId: e.turnId, index: e.index, answer: 'tamam', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('tool.call', ($, e) => (e.tool === 'Bash' && e.command.includes('fail') ? { isError: true, result: 'failed', text: 'failed' } : { result: 'ok' }))
  on('session.usage', () => ({ value: { startedAt: NOW, context: { window: 1_000_000, tokens: contextTokens }, rateLimits: [] } }))
  on('session.id', () => ({ value: 'old-1' }))
  on('model.complete', () => ({ value: { isAnswered: true, text: 'T2', usage: ZERO } }))
  on('model.fork', () => {
    seen.forks += 1

    return { value: { isAnswered: true, text: `\`\`\`\n${NOTE}\n\`\`\``, usage: ZERO } }
  })
  on('command.run', { command: 'clear' }, async () => {
    seen.clears += 1
    // The engine ends the old conversation as it clears it.
    await engine.session.end({ reason: 'clear', sessionId: 'old-1', resume: { id: 'old-1' } })

    return { text: '' }
  })
  on('ui.open', ($, e) => {
    seen.opened.push(e.id)

    return { value: { isPlaced: true } }
  })
  on('session.end', ($, e) => ({ sessionId: e.sessionId }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))

  return seen
}

async function say($: Engine, text: string): Promise<void> {
  await $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
}

// One turn of the main thread that runs `command` in Bash.
async function turnWith($: Engine, turnId: string, command: string): Promise<void> {
  await say($, 'testleri çalıştır ve commit et')
  const stream = $.turn.step({ turnId, index: 0, model: 'claude-opus-5-5', effort: 'high', messageCount: 1 })
  for await (const _chunk of stream) {
    // Drained only to reach the result.
  }
  await stream.result
  await $.tool.call({ tool: 'Bash', command })
  await $.turn.complete({ turnId, answer: 'tamam', durationMs: 10, isAborted: false, reason: 'answer', usage: { model: 'claude-opus-5-5', ...ZERO } })
  // The note is written after the turn ends, not awaited by it.
  for (let i = 0; i < 20; i += 1) {
    await $.command.run({ command: 'gear', args: 'yardim' })
  }
}

describe('the hand-over offer', () => {
  for (const surface of ['terminal', 'desktop'] as const) {
    test(`after a commit in a large conversation the band offers a clean conversation, and nothing more (${surface})`, async ($, on) => {
      const seen = world($, on)
      await turnWith($, 't1', 'git commit -m "adım 17"')
      expect(seen.forks).toBe(1)
      const ui = await $.ui.mount({ ...BAND, surface })
      expect(await ui.find({ type: 'Text', text: /Devir notu hazır · sohbet 700 bin token/ })).toBeDefined()
      expect(await ui.find({ type: 'Button', key: 'handover-clear', text: 'temiz sohbet' })).toBeDefined()
      expect(await ui.find({ type: 'Button', key: 'handover-show', text: 'notu gör' })).toBeDefined()
      // Unasked, nothing is cleared and no pane is opened.
      expect(seen.clears).toBe(0)
      expect(seen.opened).toEqual([])
      await ui.unmount()
    })
  }

  test('a small conversation gets no offer, and no note is written', async ($, on) => {
    const seen = world($, on, { contextTokens: 60_000 })
    await turnWith($, 't1', 'git push')
    expect(seen.forks).toBe(0)
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
    expect(await ui.find({ type: 'Button', key: 'handover-clear' })).toBeUndefined()
    await ui.unmount()
  })

  test('a large conversation gets no offer for work that did not finish', async ($, on) => {
    const seen = world($, on)
    await turnWith($, 't1', 'ls -la')
    await turnWith($, 't2', 'npm test -- fail')
    await turnWith($, 't3', 'git commit -m fail')
    expect(seen.forks).toBe(0)
  })

  test('with autogear off, no note is written', async ($, on) => {
    const seen = world($, on)
    await $.command.run({ command: 'gear', args: 'sabitle' })
    await turnWith($, 't1', 'git commit -m x')
    expect(seen.forks).toBe(0)
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    test(`"notu gör" opens the note in a pane, on the press only (${surface})`, async ($, on) => {
      const seen = world($, on)
      await turnWith($, 't1', 'npm test')
      const band = await $.ui.mount({ ...BAND, surface })
      await band.press({ key: 'handover-show' })
      expect(seen.opened).toEqual(['autogear-handover'])
      expect(seen.clears).toBe(0)
      const pane = await $.ui.mount({
        plugin: 'autogear',
        surface,
        component: 'Pane',
        requestId: 'autogear-handover',
        props: { title: 'Devir notu', isFocused: false, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
      })
      expect(await pane.find({ type: 'Text', text: 'Devir notu: autogear (17 Ekim 2026)' })).toBeDefined()
      expect(await pane.find({ type: 'Text', text: 'Eski sohbet: claude --resume old-1' })).toBeDefined()
      await pane.unmount()
      await band.unmount()
    })
  }

  test('"temiz sohbet" clears the conversation and the next prompt carries the note, once', async ($, on) => {
    const seen = world($, on)
    await turnWith($, 't1', 'git commit -m x && git push')
    const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
    await band.press({ key: 'handover-clear' })
    expect(seen.clears).toBe(1)
    expect(await band.find({ type: 'Text', text: /devir notu ilk mesajınla gidecek/ })).toBeDefined()
    expect(await band.find({ type: 'Button', key: 'handover-clear' })).toBeUndefined()
    const before = seen.contexts.length
    await say($, 'adım 18 ile devam edelim')
    const carried = seen.contexts[before]?.join('\n') ?? ''
    expect(carried).toContain('Devir notu: autogear (17 Ekim 2026)')
    expect(carried).toContain('Eski sohbet: claude --resume old-1')
    expect(carried).not.toContain('```')
    await say($, 'bir şey daha')
    expect(seen.contexts[before + 1]).toBeUndefined()
    expect(await band.find({ type: 'Text', text: /devir notu/ })).toBeUndefined()
    await band.unmount()
  })

  test('a /clear the person ran carries no note, and the offer goes', async ($, on) => {
    const seen = world($, on)
    await turnWith($, 't1', 'git commit -m x')
    await $.session.end({ reason: 'clear', sessionId: 'old-1', resume: { id: 'old-1' } })
    const before = seen.contexts.length
    await say($, 'yeni iş')
    expect(seen.contexts[before]).toBeUndefined()
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
    expect(await ui.find({ type: 'Button', key: 'handover-clear' })).toBeUndefined()
    await ui.unmount()
  })

  test('writing on keeps the offer and carries nothing; × takes it down', async ($, on) => {
    const seen = world($, on)
    await turnWith($, 't1', 'git commit -m x')
    const before = seen.contexts.length
    await say($, 'şimdi README dosyasını güncelle')
    expect(seen.contexts[before]).toBeUndefined()
    expect(seen.clears).toBe(0)
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
    expect(await ui.find({ type: 'Button', key: 'handover-clear' })).toBeDefined()
    await ui.press({ key: 'handover-dismiss' })
    expect(await ui.find({ type: 'Button', key: 'handover-clear' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /devir notu/i })).toBeUndefined()
    expect(seen.clears).toBe(0)
    await ui.unmount()
  })
})

describe('the hand-over rules', () => {
  test('finished work is a commit, a push or a passing test run', () => {
    expect(isWorkDone('git commit -m "x"', false)).toBe(true)
    expect(isWorkDone('git -C /c/autogear push origin main', false)).toBe(true)
    expect(isWorkDone('npm test', false)).toBe(true)
    expect(isWorkDone('claude plugin test .', false)).toBe(true)
    expect(isWorkDone('npm test', true)).toBe(false)
    expect(isWorkDone('git status', false)).toBe(false)
    expect(isWorkDone('cat tests/router.test.ts', false)).toBe(false)
    expect(isWorkDone('git log --oneline | grep commit', false)).toBe(false)
  })

  test('the note loses its fences and blank lines, and is cut short', () => {
    expect(cleanNote('```\nbir\n\niki\n```')).toBe('bir\niki')
    expect(cleanNote(Array.from({ length: 30 }, (_, i) => `satır ${i}`).join('\n')).split('\n').length).toBe(12)
  })

  test('the context names the old conversation when it is known', () => {
    expect(handoverContext('not', 'abc')).toContain('claude --resume abc')
    expect(handoverContext('not', undefined)).not.toContain('--resume')
  })
})
