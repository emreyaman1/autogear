import { describe, expect, test } from 'claude-code/testing'

import { DE } from '../eval/i18n/de'
import { EN } from '../eval/i18n/en'
import { ES } from '../eval/i18n/es'
import { FR } from '../eval/i18n/fr'
import { JA } from '../eval/i18n/ja'
import { RU } from '../eval/i18n/ru'
import { TR } from '../eval/i18n/tr'
import { ZH } from '../eval/i18n/zh'
import { BLIND } from '../eval/i18n/blind'
import { BLIND2 } from '../eval/i18n/blind2'
import { BLIND3 } from '../eval/i18n/blind3'
import { BLIND4 } from '../eval/i18n/blind4'
import { TRICKY } from '../eval/i18n/tricky'
import { HELD, HELD_TEXTS } from '../eval/i18n/held'
import { HELD2, HELD2_TEXTS } from '../eval/i18n/held2'
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
        console.log(`MLJSON ${JSON.stringify({ language, text, tier: source.tier, prevTier: source.prevTier, got: got.tier, confidence: got.confidence, kind: got.kind, floor: got.floor, forced: got.reasons.some(reason => reason.startsWith('Türkçe ya da İngilizce değil')) })}`)
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

// Two more sets, each in every language. HELD was written before the rules
// were tuned for the languages and its misses were looked at once; HELD2 was
// written after, with other wording, and is read once and never tuned on: it is
// the score to trust (eval/i18n/held.ts, held2.ts).
const HELD_SETS: readonly { name: string; cases: readonly Case[]; texts: Record<string, readonly string[]> }[] = [
  { name: 'HELD', cases: HELD, texts: HELD_TEXTS },
  { name: 'HELD2', cases: HELD2, texts: HELD2_TEXTS },
]

describe('the classifier on prompts it was not tuned on (rules alone)', () => {
  for (const { name, cases, texts: byLanguage } of HELD_SETS) {
    for (const [language, texts] of Object.entries(byLanguage)) {
      test(`${name} ${language}: every prompt scored against its label`, () => {
        expect(texts.length).toBe(cases.length)
        let exact = 0
        let within1 = 0
        let severe = 0
        const misses: string[] = []
        texts.forEach((text, index) => {
          const source = cases[index]
          if (source === undefined) {
            return
          }
          const got = classify(text, source.prevTier === undefined ? {} : { prevTier: source.prevTier })
          const gap = got.tier - source.tier
          exact += gap === 0 ? 1 : 0
          within1 += Math.abs(gap) <= 1 ? 1 : 0
          const isSevere = gap <= -2 || (source.tier >= 3 && got.tier <= 1)
          severe += isSevere ? 1 : 0
          // One line per prompt for eval/haiku.mjs --held.
          console.log(`HELDJSON ${JSON.stringify({ set: name, language, text, tier: source.tier, prevTier: source.prevTier, got: got.tier, confidence: got.confidence, kind: got.kind, floor: got.floor, forced: got.reasons.some(reason => reason.startsWith('Türkçe ya da İngilizce değil')) })}`)
          if (isSevere) {
            misses.push(`T${source.tier}→T${got.tier}${got.confidence === 'low' ? '?' : ''}  ${text.replace(/\n/g, ' ').slice(0, 60)}`)
          }
        })
        const n = texts.length
        const pct = (value: number): string => `${Math.round((100 * value) / n)}%`
        console.log(`${name} ${language}: n=${n} exact=${pct(exact)} within1=${pct(within1)} severe=${severe} (${pct(severe)})`)
        for (const miss of misses) {
          console.log(`  ${language} ${miss}`)
        }
      })
    }
  }
})

// Words that mean hard work in one sentence are harmless in another: none of
// these small asks may reach T3, in any language.
const SMALL_ASKS: readonly string[] = [
  'replace all the tabs with spaces',
  'make the animation faster',
  'move the button from the left to the right',
  'cut the video in half',
  'tüm sekmeleri boşlukla değiştir',
  'animasyonu daha hızlı yap',
  'mueve el botón de la izquierda a la derecha',
  'sustituye todos los tabs por espacios',
  'pon el texto a la mitad de la pantalla',
  'haz la animación más rápida',
  'cambia el color del botón a azul',
  'ersetze alle Tabs durch Leerzeichen',
  'mach die Animation schneller',
  'ändere die Schriftfarbe auf Grau',
  'schreib den Titel in Großbuchstaben',
  "remplace tous les onglets par des espaces",
  "rends l'animation plus rapide",
  'passe le titre en gras',
  'замени все табы на пробелы',
  'сделай анимацию быстрее',
  'измени цвет кнопки на синий',
  'переименуй переменную в total',
  '把所有制表符替换成空格',
  '让动画更快一点',
  '把按钮的颜色改成蓝色',
  'すべてのタブをスペースに置き換えて',
  'アニメーションを速くして',
  'ボタンの色を青に変えて',
  'añade el token al header de la petición',
  'ändere den Platzhalter im Passwort-Feld',
  'change le texte du champ mot de passe',
  'измени подпись у поля пароль',
  '把密码输入框的提示改成请输入密码',
  'パスワード欄のラベルを変えて',
  'rename the session variable to currentSession',
  'make the loading text "not sure yet" gray',
]

// The fourth to eighth sets, written by another model that was not shown the
// rules (eval/i18n/blind.ts, blind2.ts, blind3.ts, tricky.ts, blind4.ts), each language its
// own prompts. BLIND, BLIND3 and TRICKY were tuned on after their first read;
// BLIND2 and BLIND4 were read once and never tuned on.
const BLIND_SETS = [
  ['BLIND', BLIND],
  ['BLIND2', BLIND2],
  ['BLIND3', BLIND3],
  ['TRICKY', TRICKY],
  ['BLIND4', BLIND4],
] as const

describe('the classifier on prompts written blind (rules alone)', () => {
  for (const [setName, set] of BLIND_SETS) {
    for (const [language, cases] of Object.entries(set)) {
      test(`${setName} ${language}: every prompt scored against its label`, () => {
        let exact = 0
        let within1 = 0
        let severe = 0
        const misses: string[] = []
        for (const source of cases) {
          const got = classify(source.text, source.prevTier === undefined ? {} : { prevTier: source.prevTier })
          const gap = got.tier - source.tier
          exact += gap === 0 ? 1 : 0
          within1 += Math.abs(gap) <= 1 ? 1 : 0
          const isSevere = gap <= -2 || (source.tier >= 3 && got.tier <= 1)
          severe += isSevere ? 1 : 0
          console.log(`HELDJSON ${JSON.stringify({ set: setName, language, text: source.text, tier: source.tier, prevTier: source.prevTier, got: got.tier, confidence: got.confidence, kind: got.kind, floor: got.floor, forced: got.reasons.some(reason => reason.startsWith('Türkçe ya da İngilizce değil')) })}`)
          if (isSevere) {
            misses.push(`T${source.tier}→T${got.tier}${got.confidence === 'low' ? '?' : ''}  ${source.text.replace(/\n/g, ' ').slice(0, 70)}`)
          }
        }
        const n = cases.length
        const pct = (value: number): string => `${Math.round((100 * value) / n)}%`
        console.log(`${setName} ${language}: n=${n} exact=${pct(exact)} within1=${pct(within1)} severe=${severe} (${pct(severe)})`)
        for (const miss of misses) {
          console.log(`  ${language} ${miss}`)
        }
      })
    }
  }
})

describe('small asks stay small in every language', () => {
  test('no small ask reaches T3', () => {
    const risen = SMALL_ASKS.filter(text => classify(text).tier >= 3).map(text => `T${classify(text).tier}  ${text}`)
    expect(risen).toEqual([])
  })
})
