import { describe, expect, test } from 'claude-code/testing'

import { DE } from '../eval/i18n/de'
import { EN } from '../eval/i18n/en'
import { ES } from '../eval/i18n/es'
import { FR } from '../eval/i18n/fr'
import { JA } from '../eval/i18n/ja'
import { RU } from '../eval/i18n/ru'
import { TR } from '../eval/i18n/tr'
import { ZH } from '../eval/i18n/zh'
import { DEV, FRESH, HOLDOUT, type Case } from '../eval/prompts'
import { classify } from '../hooks/core/signals'

// The 143 labelled prompts in other languages, each list in the order of
// DEV, HOLDOUT and FRESH: the label of a translation is its source's.
const SOURCES: readonly Case[] = [...DEV, ...HOLDOUT, ...FRESH]

const LANGUAGES: Record<string, readonly string[]> = { tr: TR, en: EN, es: ES, de: DE, fr: FR, ru: RU, zh: ZH, ja: JA }

// Step 5's bar, per language: within one tier at least 90%, severe at most 2%.
const WITHIN_GOAL = 0.9
const SEVERE_GOAL = 0.02

describe('the classifier in other languages (rules alone)', () => {
  for (const [language, texts] of Object.entries(LANGUAGES)) {
    test(`${language}: every prompt translated, scored against its label`, () => {
      expect(texts.length).toBe(SOURCES.length)
      let exact = 0
      let within1 = 0
      let severe = 0
      let unsure = 0
      const misses: string[] = []
      texts.forEach((text, index) => {
        const source = SOURCES[index]
        if (source === undefined) {
          return
        }
        const got = classify(text, source.prevTier === undefined ? {} : { prevTier: source.prevTier })
        const gap = got.tier - source.tier
        exact += gap === 0 ? 1 : 0
        within1 += Math.abs(gap) <= 1 ? 1 : 0
        const isSevere = gap <= -2 || (source.tier >= 3 && got.tier <= 1)
        severe += isSevere ? 1 : 0
        unsure += got.confidence === 'low' ? 1 : 0
        // One line per prompt for eval/haiku.mjs --languages, which asks Haiku where the rules are unsure.
        console.log(`MLJSON ${JSON.stringify({ language, text, tier: source.tier, prevTier: source.prevTier, got: got.tier, confidence: got.confidence, kind: got.kind, floor: got.floor })}`)
        if (isSevere) {
          misses.push(`T${source.tier}→T${got.tier}${got.confidence === 'low' ? '?' : ''}  ${text.replace(/\n/g, ' ').slice(0, 70)}`)
        }
      })
      const n = texts.length
      const pct = (value: number): string => `${Math.round((100 * value) / n)}%`
      const goal = within1 / n >= WITHIN_GOAL && severe / n <= SEVERE_GOAL ? 'hedefte' : 'hedefin altında'
      console.log(`LANG ${language}: n=${n} exact=${pct(exact)} within1=${pct(within1)} severe=${severe} (${pct(severe)}) unsure=${pct(unsure)} · ${goal}`)
      for (const miss of misses) {
        console.log(`  ${language} ${miss}`)
      }
    })
  }
})
