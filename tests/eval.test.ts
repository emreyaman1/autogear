import { describe, expect, test } from 'claude-code/testing'

import { DEV, FRESH, HOLDOUT, type Case } from '../eval/prompts'
import { classify } from '../hooks/core/signals'

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
    console.log(`EVALJSON ${JSON.stringify({ text: item.text, tier: item.tier, prevTier: item.prevTier, got: got.tier, confidence: got.confidence })}`)
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

describe('classifier quality on fresh prompts', () => {
  test('fresh set: reported, held to a floor only', () => {
    const s = score(FRESH)
    report('fresh', s)
    expect(s.within1 / s.n).toBeGreaterThan(0.6)
  })
})
