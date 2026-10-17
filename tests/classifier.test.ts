import { describe, expect, test } from 'claude-code/testing'

import { DEV, FRESH, HOLDOUT, type Case } from '../eval/prompts'
import { FAMILY_NAMES } from '../hooks/core/models'
import { decide } from '../hooks/core/policy'
import { classify } from '../hooks/core/signals'
import { PROFILE_IDS, PROFILES } from '../hooks/core/tiers'

type Score = {
  n: number
  exact: number
  within1: number
  // Predicted below the label: the cheaper mistake to make, but a mistake that
  // hands work to a weaker model.
  under: number
  // Two tiers or more below, or hard work (T3+) sent to T0/T1.
  severe: number
  over: number
  // How often the rules were unsure and would ask Haiku.
  unsure: number
  misses: string[]
}

function score(cases: readonly Case[]): Score {
  const result: Score = { n: cases.length, exact: 0, within1: 0, under: 0, severe: 0, over: 0, unsure: 0, misses: [] }
  for (const item of cases) {
    const got = classify(item.text, item.prevTier === undefined ? {} : { prevTier: item.prevTier })
    const gap = got.tier - item.tier
    result.exact += gap === 0 ? 1 : 0
    result.within1 += Math.abs(gap) <= 1 ? 1 : 0
    result.under += gap < 0 ? 1 : 0
    result.over += gap > 0 ? 1 : 0
    result.severe += gap <= -2 || (item.tier >= 3 && got.tier <= 1) ? 1 : 0
    result.unsure += got.confidence === 'low' ? 1 : 0
    // One line per prompt for eval/haiku.mjs, which asks Haiku the same.
    console.log(
      `EVALJSON ${JSON.stringify({ text: item.text, tier: item.tier, prevTier: item.prevTier, got: got.tier, confidence: got.confidence, kind: got.kind, floor: got.floor })}`,
    )
    if (gap !== 0) {
      result.misses.push(`T${item.tier}→T${got.tier}${got.confidence === 'low' ? '?' : ''}  ${item.text.replace(/\n/g, ' ').slice(0, 70)}  [${got.reasons.join('; ')}]`)
    }
  }

  return result
}

function report(name: string, s: Score): void {
  const pct = (value: number): string => `${Math.round((100 * value) / s.n)}%`
  console.log(
    `EVAL ${name}: n=${s.n} exact=${pct(s.exact)} within1=${pct(s.within1)} under=${s.under} severe=${s.severe} over=${s.over} unsure=${pct(s.unsure)}`,
  )
  for (const miss of s.misses) {
    console.log(`  ${name} ${miss}`)
  }
}

describe('classifier quality', () => {
  test('dev set: no severe under-classification', () => {
    const s = score(DEV)
    report('dev', s)
    expect(s.severe).toBe(0)
  })

  test('holdout set: reported, held to a floor only', () => {
    const s = score(HOLDOUT)
    report('holdout', s)
    expect(s.within1 / s.n).toBeGreaterThan(0.6)
  })
})

// What each labelled prompt would run on, by the rules alone, under an Opus ·
// high picker with calm windows: the effort table measured on the same sets.
describe('routes of the labelled prompts', () => {
  test('clear work runs on Sonnet at medium, vague hunts on Opus at high, located ones on Sonnet at high, nothing at max', () => {
    const all = [...DEV, ...HOLDOUT, ...FRESH]
    for (const profile of PROFILE_IDS) {
      const routes = new Map<string, number>()
      let hunts = 0
      for (const item of all) {
        const rule = classify(item.text, item.prevTier === undefined ? {} : { prevTier: item.prevTier })
        const decision = decide({
          tier: rule.tier,
          source: rule.source,
          reasons: rule.reasons,
          override: rule.override,
          profile,
          ceiling: { family: 'opus', effort: 'high' },
          pace: { level: 'normal' },
          allowHaiku: true,
          hunt: rule.hunt,
        })
        const route = `T${decision.tier} ${FAMILY_NAMES[decision.family]}·${decision.effort}${rule.hunt === undefined ? '' : ` (av: ${rule.hunt === 'vague' ? 'belirsiz' : 'yeri belli'})`}`
        routes.set(route, (routes.get(route) ?? 0) + 1)
        hunts += rule.hunt === undefined ? 0 : 1
        if (decision.tier >= 1 && decision.tier <= 2 && decision.family === 'sonnet') {
          expect(decision.effort).toBe('medium')
        }
        if (rule.hunt === 'vague' && decision.family === 'opus') {
          expect(decision.effort).toBe('high')
        }
        if (rule.hunt === 'located') {
          expect(decision).toMatchObject({ family: 'sonnet', effort: decision.tier >= 4 ? 'xhigh' : 'high' })
        }
      }
      const table = [...routes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([route, count]) => `${route} ${count}`)
      console.log(`EVAL route ${profile}: n=${all.length} hunts=${hunts} | ${table.join(' | ')}`)
    }
    for (const profile of PROFILE_IDS) {
      for (const spec of PROFILES[profile]) {
        expect(Object.values(spec.effort)).not.toContain('max')
      }
    }
  })
})

describe('classifier quality on fresh prompts', () => {
  test('fresh set: reported, held to a floor only', () => {
    const s = score(FRESH)
    report('fresh', s)
    expect(s.within1 / s.n).toBeGreaterThan(0.6)
  })
})
