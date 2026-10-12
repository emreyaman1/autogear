import { describe, expect, test } from 'claude-code/testing'

import { pace } from '../hooks/core/pacing'
import { decide } from '../hooks/core/policy'
import { costOf, readTokens, turnMoney, usd } from '../hooks/core/prices'
import { addTurn, emptyTotals, savedOf, savingsText, sharesOf, splitCells, sumOf } from '../hooks/core/savings'
import { addEntry, flagLast, journalText, markLast, MAX_ENTRIES, readJournal, snippet, type Entry } from '../hooks/core/journal'
import { applyCommand, DEFAULTS, readStats } from '../hooks/core/settings'
import { classify, parseOverrides } from '../hooks/core/signals'
import { SWITCH_HEIGHT, SWITCH_OFF, SWITCH_ON, SWITCH_WIDTH, switchSvg } from '../hooks/core/switch'
import { isNewerThan } from '../hooks/core/version'

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

describe('robustness', () => {
  test('a family that gave no answer is routed around, upward within the picker', () => {
    const decision = decide({
      source: 'rules',
      reasons: [],
      profile: 'tasarruf',
      pace: { level: 'normal' },
      allowHaiku: true,
      tier: 0,
      ceiling: { family: 'opus', effort: 'high' },
      unavailable: ['haiku'],
    })
    expect(decision.family).toBe('sonnet')
    expect(decision.effort).toBe('low')
  })

  test('reads Claude Code versions', () => {
    expect(isNewerThan('2.1.300', '2.1.295')).toBe(true)
    expect(isNewerThan('2.2.0', '2.1.295')).toBe(true)
    expect(isNewerThan('2.1.295', '2.1.295')).toBe(false)
    expect(isNewerThan('2.1.278 (Claude Code)', '2.1.295')).toBe(false)
  })
})

describe('switchSvg', () => {
  test('on is a green track with the knob at the right, off a gray one with the knob at the left', () => {
    const on = switchSvg(true)
    const off = switchSvg(false)
    expect(on).toContain(`<rect width="${SWITCH_WIDTH}" height="${SWITCH_HEIGHT}" rx="${SWITCH_HEIGHT / 2}" fill="${SWITCH_ON}"/>`)
    expect(off).toContain(`fill="${SWITCH_OFF}"/>`)
    expect(on).toContain(`<circle cx="${SWITCH_WIDTH - SWITCH_HEIGHT / 2}"`)
    expect(off).toContain(`<circle cx="${SWITCH_HEIGHT / 2}"`)
    expect(on).toContain('>ON</text>')
    expect(off).toContain('>OFF</text>')
  })

  test('is one svg root of the size the Svg element is given', () => {
    for (const isOn of [true, false]) {
      const svg = switchSvg(isOn)
      expect(svg).toStartWith(`<svg xmlns="http://www.w3.org/2000/svg" width="${SWITCH_WIDTH}" height="${SWITCH_HEIGHT}"`)
      expect(svg).toEndWith('</svg>')
    }
  })
})

// Dollar sums compared to a millionth: float addition leaves dust past that.
const near = (value: number): number => Math.round(value * 1e6) / 1e6

describe('prices', () => {
  const tokens = { input_tokens: 1_000_000, output_tokens: 1_000_000, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000 }

  test('a family costs its list price per token kind', () => {
    expect(near(costOf('sonnet', tokens))).toBe(near(2 + 10 + 0.2 + 2.5))
    expect(near(costOf('opus', tokens))).toBe(near(4 + 20 + 0.2 + 5))
  })

  test('a Haiku prompt past 100K tokens costs five times as much', () => {
    expect(near(costOf('haiku', { ...tokens, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }))).toBe(near(5 * (0.1 + 0.5) * 1))
    expect(near(costOf('haiku', { ...tokens, input_tokens: 1000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }))).toBe(near(0.0001))
  })

  test('a turn that switched model prices its cache writes as reads on the picker model', () => {
    const written = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 100_000 }
    expect(near(turnMoney('haiku', 'opus', written, false).baseline)).toBe(near(0.5))
    expect(near(turnMoney('haiku', 'opus', written, true).baseline)).toBe(near(0.02))
  })

  test('money reads in dollars with more places for small sums', () => {
    expect(usd(1.234)).toBe('$1,23')
    expect(usd(0.0314)).toBe('$0,031')
    expect(usd(0.00096)).toBe('$0,0010')
    expect(usd(-0.5)).toBe('-$0,50')
    expect(usd(-0.00001)).toBe('$0,0000')
  })

  test('bad numbers in usage count as zero', () => {
    expect(readTokens({ input_tokens: NaN, output_tokens: '5', cache_read_input_tokens: 7 }).output_tokens).toBe(0)
    expect(readTokens({ cache_read_input_tokens: 7 }).cache_read_input_tokens).toBe(7)
  })
})

describe('savings', () => {
  const tokens = { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 90, cache_creation_input_tokens: 0 }

  test('a report adds up what was spent against the picker, per model', () => {
    const all = emptyTotals()
    addTurn(all, 'haiku', { spent: 0.001, baseline: 0.032 }, tokens)
    addTurn(all, 'opus', { spent: 0.02, baseline: 0.02 }, tokens)
    all.overhead = 0.0005
    expect(near(savedOf(all))).toBe(near(0.0305))
    expect(sumOf(all).turns).toBe(2)
    const report = savingsText(emptyTotals(), all, Date.parse('2026-10-12T12:00:00Z'))
    expect(report).toContain('| Tur | 0 | 2 |')
    expect(report).toContain('| Seçici modeliyle | – | $0,052 |')
    expect(report).toContain('| Haiku | 1 (%50) | $0,0010 | $0,032 | $0,031 |')
    expect(report).toContain('Önbellek isabeti %90')
    expect(report).toContain('$0,0005')
  })

  test('an empty report says so', () => {
    expect(savingsText(emptyTotals(), emptyTotals(), undefined)).toContain('Henüz kayıtlı tur yok')
  })

  test('the families that ran share the turns', () => {
    const all = emptyTotals()
    addTurn(all, 'haiku', { spent: 0, baseline: 0 }, tokens)
    addTurn(all, 'haiku', { spent: 0, baseline: 0 }, tokens)
    addTurn(all, 'opus', { spent: 0, baseline: 0 }, tokens)
    expect(sharesOf(all).map(share => [share.family, share.turns])).toEqual([['haiku', 2], ['opus', 1]])
  })

  test('a bar is split by weight, every family that ran keeping a cell', () => {
    expect(splitCells([0.5, 0.3, 0.2], 10)).toEqual([5, 3, 2])
    expect(splitCells([0.97, 0.03], 20).reduce((a, b) => a + b, 0)).toBe(20)
    expect(splitCells([0.99, 0.01], 20)[1]).toBe(1)
    expect(splitCells([1, 0], 8)).toEqual([8, 0])
    expect(splitCells([0, 0], 8)).toEqual([0, 0])
    expect(splitCells([3, 2, 1], 2)).toEqual([1, 1, 0])
  })

  test('stored turn counts from before the dollar counts carry over', () => {
    const stats = readStats({ turns: 35, byFamily: { haiku: 18, sonnet: 10, opus: 7 }, overrides: 2, escalations: 1 })
    expect(stats.families.haiku.turns).toBe(18)
    expect(sumOf(stats).turns).toBe(35)
    expect(stats.overrides).toBe(2)
    expect(sumOf(readStats(undefined)).turns).toBe(0)
    const kept = readStats({ families: { opus: { turns: 3, spent: 1.5, baseline: 2 } }, byFamily: { opus: 99 }, overhead: 0.1 })
    expect(kept.families.opus).toMatchObject({ turns: 3, spent: 1.5, baseline: 2, input: 0 })
    expect(kept.overhead).toBe(0.1)
  })

  test('/gear tasarruf and sifirla are read', () => {
    expect(applyCommand(DEFAULTS, 'tasarruf', '')).toBe('savings')
    expect(applyCommand(DEFAULTS, 'sifirla', '')).toBe('reset')
  })
})

describe('journal', () => {
  const entry = (text: string, extra: Partial<Entry> = {}): Entry => ({
    at: Date.parse('2026-10-13T09:30:00'),
    text,
    tier: 1,
    family: 'sonnet',
    effort: 'medium',
    source: 'kural',
    ceiling: 'opus',
    spent: 0.01,
    baseline: 0.04,
    flags: [],
    mark: undefined,
    ...extra,
  })

  test('a message is cut to its start, one line, no table breakers', () => {
    expect(snippet('  a\n\nb  ')).toBe('a b')
    expect(snippet('x'.repeat(300)).length).toBeLessThan(110)
  })

  test('the log keeps the latest entries only', () => {
    const entries: Entry[] = []
    for (let index = 0; index < MAX_ENTRIES + 5; index += 1) addEntry(entries, entry(`m${index}`))
    expect(entries).toHaveLength(MAX_ENTRIES)
    expect(entries[0]?.text).toBe('m5')
  })

  test('a complaint flags the answer before it, a mark the latest one', () => {
    const entries = [entry('ilk'), entry('ikinci')]
    flagLast(entries, 'şikâyetle yükseltildi')
    flagLast(entries, 'şikâyetle yükseltildi')
    expect(entries[1]?.flags).toEqual(['şikâyetle yükseltildi'])
    expect(markLast(entries, 'zayif')?.text).toBe('ikinci')
    const report = journalText(entries)
    expect(report).toContain('Şüpheli kararlar: 1 / 2 (50%)')
    expect(report).toContain('siz: çok zayıftı')
    expect(report).toContain('| T1 | Sonnet · medium | kural |')
  })

  test('stored entries that are not entries are dropped, and an empty log says so', () => {
    expect(readJournal([{ text: 'x', family: 'opus', tier: 3 }, { text: 1 }, 'x', { family: 'zzz', text: 'y' }])).toHaveLength(1)
    expect(readJournal(undefined)).toEqual([])
    expect(journalText([])).toContain('Henüz kayıtlı karar yok')
  })

  test('/gear kayit and yanlis are read', () => {
    expect(applyCommand(DEFAULTS, 'kayit', '')).toBe('journal')
    expect(applyCommand(DEFAULTS, 'yanlis', 'zayif')).toBe('mark')
  })
})
