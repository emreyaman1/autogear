// What autogear has saved: the dollars the turns cost against the same turns on
// the picker's model, kept per model family for the session and for good, and
// the report of them.

import { FAMILIES, FAMILY_NAMES, type Family } from './models'
import { usd, type Tokens } from './prices'
import { L, pct } from './text'

// What the turns of one family came to.
export type Bucket = {
  turns: number
  spent: number
  baseline: number
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export type Totals = {
  families: Record<Family, Bucket>
  // What autogear's own questions to Haiku cost.
  overhead: number
}

const KEYS = ['turns', 'spent', 'baseline', 'input', 'output', 'cacheRead', 'cacheWrite'] as const satisfies readonly (keyof Bucket)[]

export const emptyBucket = (): Bucket => ({ turns: 0, spent: 0, baseline: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })

export const emptyTotals = (): Totals => ({
  families: { haiku: emptyBucket(), sonnet: emptyBucket(), opus: emptyBucket(), fable: emptyBucket() },
  overhead: 0,
})

export function addTurn(totals: Totals, family: Family, money: { spent: number; baseline: number }, tokens: Tokens): void {
  const bucket = totals.families[family]
  bucket.turns += 1
  bucket.spent += money.spent
  bucket.baseline += money.baseline
  bucket.input += tokens.input_tokens
  bucket.output += tokens.output_tokens
  bucket.cacheRead += tokens.cache_read_input_tokens
  bucket.cacheWrite += tokens.cache_creation_input_tokens
}

export function sumOf(totals: Totals): Bucket {
  const sum = emptyBucket()
  for (const family of FAMILIES) {
    for (const key of KEYS) {
      sum[key] += totals.families[family][key]
    }
  }

  return sum
}

export const savedBy = (bucket: Bucket): number => bucket.baseline - bucket.spent

// Net of what autogear's own questions cost.
export const savedOf = (totals: Totals): number => savedBy(sumOf(totals)) - totals.overhead

// The share of the picker's bill that was saved, from 0 (none, or less) to 1.
export const rateOf = (saved: number, baseline: number): number => (baseline > 0 ? Math.max(0, Math.min(1, saved / baseline)) : 0)

export function percent(part: number, whole: number): string {
  const value = whole > 0 ? Math.round((100 * part) / whole) : 0

  return value < 0 ? `-${pct(-value)}` : pct(value)
}

export const promptOf = (bucket: Bucket): number => bucket.input + bucket.cacheRead + bucket.cacheWrite

// The part of the prompt tokens that came from the cache.
export const cacheHit = (bucket: Bucket): number => (promptOf(bucket) > 0 ? bucket.cacheRead / promptOf(bucket) : 0)

// 4.0M reads 4M, 715.0k reads 715k, as the usage panel writes them.
const trimmed = (value: number): string => value.toFixed(1).replace(/\.0$/, '')

export const kilo = (tokens: number): string =>
  tokens >= 1_000_000 ? `${trimmed(tokens / 1_000_000)}M` : tokens >= 1000 ? `${trimmed(tokens / 1000)}k` : String(tokens)

export const dash = (text: string, isEmpty: boolean): string => (isEmpty ? '–' : text)

// The families that have a turn, by the share of the turns they took.
export function sharesOf(totals: Totals): { family: Family; turns: number; fraction: number }[] {
  const all = sumOf(totals).turns

  return FAMILIES.filter(family => totals.families[family].turns > 0).map(family => ({
    family,
    turns: totals.families[family].turns,
    fraction: totals.families[family].turns / all,
  }))
}

// Divides `width` cells among the weights, in proportion: every weight that
// has any gets at least one cell, the width allowing.
export function splitCells(weights: readonly number[], width: number): number[] {
  const cells = weights.map(() => 0)
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  const present = weights.flatMap((weight, index) => (weight > 0 ? [index] : []))
  if (total <= 0 || width <= 0) {
    return cells
  }
  if (width <= present.length) {
    for (const index of [...present].sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0)).slice(0, width)) {
      cells[index] = 1
    }

    return cells
  }
  for (const index of present) {
    cells[index] = 1
  }
  const room = width - present.length
  const exact = weights.map(weight => (weight / total) * room)
  let left = room
  exact.forEach((value, index) => {
    cells[index] = (cells[index] ?? 0) + Math.floor(value)
    left -= Math.floor(value)
  })
  const rest = (index: number): number => (exact[index] ?? 0) - Math.floor(exact[index] ?? 0)
  for (const index of [...present].sort((a, b) => rest(b) - rest(a))) {
    if (left <= 0) {
      break
    }
    cells[index] = (cells[index] ?? 0) + 1
    left -= 1
  }

  return cells
}

const tokenLine = (bucket: Bucket): string =>
  L(
    `input ${kilo(bucket.input)} · output ${kilo(bucket.output)} · cache read ${kilo(bucket.cacheRead)} · write ${kilo(bucket.cacheWrite)}`,
    `girdi ${kilo(bucket.input)} · çıktı ${kilo(bucket.output)} · önbellek okuma ${kilo(bucket.cacheRead)} · yazma ${kilo(bucket.cacheWrite)}`,
  )

// The report as markdown: what the model reads, and what is drawn where the
// card cannot be.
export function savingsText(session: Totals, all: Totals, since: number | undefined): string {
  const [now, ever] = [sumOf(session), sumOf(all)]
  if (ever.turns === 0) {
    return L(
      '**Savings**\n\nNo turns recorded yet: the figures build up as autogear finishes answers.',
      '**Tasarruf**\n\nHenüz kayıtlı tur yok: rakamlar autogear bir cevap bitirdikçe birikir.',
    )
  }
  const gain = (totals: Totals, bucket: Bucket): string => {
    const saved = savedOf(totals)

    return dash(`**${usd(saved)}** (${percent(saved, bucket.baseline)})`, bucket.turns === 0)
  }
  const shares = sharesOf(all)
  const rows = shares.map(({ family, turns, fraction }) => {
    const bucket = all.families[family]

    return `| ${FAMILY_NAMES[family]} | ${turns} (${percent(fraction, 1)}) | ${usd(bucket.spent)} | ${usd(bucket.baseline)} | ${usd(savedBy(bucket))} |`
  })

  return [
    L('**Savings** · estimate, at API list prices', '**Tasarruf** · tahmin, API liste fiyatıyla'),
    '',
    L('| | This session | Total |', '| | Bu oturum | Toplam |'),
    '|:--|--:|--:|',
    `| ${L('Spent', 'Harcama')} | ${dash(usd(now.spent + session.overhead), now.turns === 0)} | ${usd(ever.spent + all.overhead)} |`,
    `| ${L("On the picker's model", 'Seçici modeliyle')} | ${dash(usd(now.baseline), now.turns === 0)} | ${usd(ever.baseline)} |`,
    `| ${L('Saved', 'Tasarruf')} | ${gain(session, now)} | ${gain(all, ever)} |`,
    `| ${L('Turns', 'Tur')} | ${now.turns} | ${ever.turns} |`,
    '',
    L("| Model | Turns | Spent | On the picker's model | Saved |", '| Model | Tur | Harcama | Seçici modeliyle | Tasarruf |'),
    '|:--|--:|--:|--:|--:|',
    ...rows,
    '',
    `${L('Cache hit', 'Önbellek isabeti')} ${percent(cacheHit(ever), 1)} · ${tokenLine(ever)}`,
    all.overhead === 0
      ? undefined
      : L(
          `autogear's own cost (questions to Haiku): ${usd(all.overhead)}, taken off the saving.`,
          `autogear'ın kendi maliyeti (Haiku'ya sorular): ${usd(all.overhead)}, tasarruftan düşüldü.`,
        ),
    since === undefined || since === 0
      ? undefined
      : L(
          `Counting since ${new Date(since).toLocaleDateString('en-US')}; /gear reset clears it.`,
          `Sayım ${new Date(since).toLocaleDateString('tr-TR')} tarihinden beri; /gear sifirla ile sıfırlanır.`,
        ),
  ]
    .filter(line => line !== undefined)
    .join('\n')
}
