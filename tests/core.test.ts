import { describe, expect, test } from 'claude-code/testing'

import { pace } from '../hooks/core/pacing'
import { decide } from '../hooks/core/policy'
import { applyCommand, DEFAULTS } from '../hooks/core/settings'
import { classify, parseOverrides } from '../hooks/core/signals'

describe('classify', () => {
  const cases: ReadonlyArray<readonly [string, number]> = [
    ['bu fonksiyon ne yapıyor?', 0],
    ['commit mesajı yaz', 0],
    ['bu değişkeni yeniden adlandır', 0],
    ['butonun rengini mavi yap', 1],
    ['login sayfasına şifre sıfırlama özelliği ekle ve testlerini yaz', 2],
    ['TypeError: Cannot read properties of undefined (reading "map")\n    at App (src/App.tsx:12:5)', 2],
    ['bu mimariyi neden böyle kurduk, alternatifleri karşılaştır', 3],
    ['ultrathink: tüm projeyi yeniden tasarla', 4],
  ]
  for (const [prompt, tier] of cases) {
    test(`T${tier}: ${prompt.slice(0, 40)}`, () => {
      expect(classify(prompt).tier).toBe(tier)
    })
  }

  test('a complaint after a turn raises the tier, twice in a row by two', () => {
    expect(classify('hâlâ aynı hata veriyor', { prevTier: 2 }).tier).toBe(3)
    expect(classify('hâlâ aynı hata veriyor', { prevTier: 2, frustrationStreak: 1 }).tier).toBe(4)
  })

  test('a short go-ahead keeps the previous tier', () => {
    const result = classify('evet, devam et', { prevTier: 3 })
    expect(result.tier).toBe(3)
    expect(result.source).toBe('inherit')
  })

  test('a go-ahead that asks for more is classified afresh', () => {
    expect(classify('tamam ama testleri de ekle', { prevTier: 0 }).source).toBe('rules')
  })

  test('a single work cue leaves the rules unsure', () => {
    expect(classify('şu fonksiyonu düzelt').confidence).toBe('low')
  })
})

describe('parseOverrides', () => {
  test('leading +tokens pick the model and effort and leave the prompt', () => {
    const parsed = parseOverrides('+opus +max bu hatayı bul')
    expect(parsed.text).toBe('bu hatayı bul')
    expect(parsed.override?.family).toBe('opus')
    expect(parsed.override?.effort).toBe('max')
  })

  test('an unknown token or a bare token changes nothing', () => {
    expect(parseOverrides('+bilinmeyen merhaba').override).toBeUndefined()
    expect(parseOverrides('+opus').text).toBe('+opus')
  })
})

describe('decide', () => {
  const base = { source: 'rules', reasons: [], profile: 'tasarruf', pace: { level: 'normal' }, allowHaiku: true } as const

  test('never above the picker', () => {
    const decision = decide({ ...base, tier: 3, ceiling: { family: 'sonnet', effort: 'high' } })
    expect(decision.family).toBe('sonnet')
    expect(decision.effort).toBe('high')
    expect(decision.isClamped).toBe(true)
  })

  test('a trivial prompt goes to Haiku at low effort', () => {
    const decision = decide({ ...base, tier: 0, ceiling: { family: 'opus', effort: 'high' } })
    expect(decision.family).toBe('haiku')
    expect(decision.effort).toBe('low')
  })

  test('a large context keeps the model on a one-tier step and moves the effort', () => {
    const decision = decide({
      ...base,
      tier: 3,
      ceiling: { family: 'opus', effort: 'max' },
      previous: { family: 'sonnet', tier: 2 },
      contextTokens: 120_000,
    })
    expect(decision.family).toBe('sonnet')
    expect(decision.effort).toBe('xhigh')
  })

  test("a prompt's own +opus outranks the picker", () => {
    const decision = decide({ ...base, tier: 1, ceiling: { family: 'sonnet', effort: 'medium' }, override: { family: 'opus' } })
    expect(decision.family).toBe('opus')
  })

  test('a window spent too fast lowers the effort; a nearly full one keeps Opus out', () => {
    const tight = decide({ ...base, tier: 2, ceiling: { family: 'opus', effort: 'max' }, pace: { level: 'tight', reason: 'x' } })
    expect(tight.effort).toBe('medium')
    const critical = decide({ ...base, tier: 4, ceiling: { family: 'opus', effort: 'max' }, pace: { level: 'critical', reason: 'x' } })
    expect(critical.family).toBe('sonnet')
  })
})

describe('pace', () => {
  const now = Date.parse('2026-10-11T12:00:00Z')
  // One hour into a five-hour window: a steady pace has spent 20%.
  const resetsAt = new Date(now + 4 * 3_600_000).toISOString()

  test('reads a window against a steady pace', () => {
    expect(pace([{ kind: 'five_hour', percentUsed: 55, resetsAt }], now).level).toBe('tight')
    expect(pace([{ kind: 'five_hour', percentUsed: 25, resetsAt }], now).level).toBe('normal')
    expect(pace([{ kind: 'five_hour', percentUsed: 92, resetsAt }], now).level).toBe('critical')
  })

  test('room left just before a reset is surplus', () => {
    const soon = new Date(now + 20 * 60_000).toISOString()
    expect(pace([{ kind: 'five_hour', percentUsed: 30, resetsAt: soon }], now).level).toBe('surplus')
  })
})

describe('applyCommand', () => {
  test('reads /gear verbs', () => {
    expect(applyCommand(DEFAULTS, 'sabitle', '')).toEqual({ ...DEFAULTS, mode: 'pin' })
    expect(applyCommand(DEFAULTS, 'profil', 'kalite')).toEqual({ ...DEFAULTS, profile: 'kalite' })
    expect(applyCommand(DEFAULTS, 'haiku', 'kapa')).toEqual({ ...DEFAULTS, allowHaiku: false })
    expect(applyCommand(DEFAULTS, '', '')).toBe('status')
    expect(applyCommand(DEFAULTS, 'profil', 'yok')).toBe('help')
  })
})
