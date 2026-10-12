// The savings card: what `/gear tasarruf` draws in the transcript in place of
// a block of text. Only Box and Text, so every surface can draw it; bars are
// runs of one thin line glyph, the filled part in color, the rest dim.

import type { BoxProps, ElementConstructor, RenderElement, TextProps } from 'claude-code'

import { FAMILIES, FAMILY_NAMES, type Family } from './core/models'
import { usd } from './core/prices'
import { cacheHit, dash, kilo, percent, promptOf, rateOf, savedBy, savedOf, sharesOf, splitCells, sumOf, type Bucket, type Totals } from './core/savings'

type Elements = { Box: ElementConstructor<BoxProps>; Text: ElementConstructor<TextProps> }

// A rate-limit window as the card shows it: its name, how full it is, when it resets.
export type LimitRow = { name: string; percentUsed: number; resetsAt: string }

export type CardInput = {
  session: Totals
  all: Totals
  // When counting began, in milliseconds; 0 when it has not.
  since: number
  limits: readonly LimitRow[]
  // Cells across the transcript.
  columns: number
}

// Mid-tone colors that read on a light and on a dark theme.
const FAMILY_COLORS: Record<Family, string> = { haiku: '#38bdf8', sonnet: '#a78bfa', opus: '#fb923c', fable: '#f472b6' }

const LINE = '━'
const RULE = '─'

// The card is at most this many cells inside its frame and padding.
const MAX_INNER = 76
const MIN_INNER = 30
const FRAME = 6
// Below this a column of the table no longer holds its figures; each family gets a line.
const MIN_COLUMN = 8

export function savingsCard({ Box, Text }: Elements, input: CardInput): RenderElement {
  const inner = Math.max(MIN_INNER, Math.min(MAX_INNER, input.columns - FRAME))
  const [now, ever] = [sumOf(input.session), sumOf(input.all)]

  const line = (fraction: number, color: string): RenderElement => {
    const filled = fraction <= 0 ? 0 : Math.max(1, Math.min(inner, Math.round(fraction * inner)))

    return (
      <Box width={inner} overflow="hidden">
        {filled > 0 && <Text color={color} wrap="truncate">{LINE.repeat(filled)}</Text>}
        {filled < inner && <Text color="inactive" wrap="truncate">{LINE.repeat(inner - filled)}</Text>}
      </Box>
    )
  }

  // Bar, the amount saved and its share of the picker's bill, and the sums beneath.
  const period = (title: string, totals: Totals, bucket: Bucket): RenderElement => {
    const saved = savedOf(totals)
    const color = saved < 0 ? 'error' : 'success'

    return (
      <Box flexDirection="column" width={inner}>
        <Box justifyContent="space-between" width={inner}>
          <Text>{title}</Text>
          <Text bold color={color}>{`${usd(saved)} tasarruf · ${percent(saved, bucket.baseline)}`}</Text>
        </Box>
        {line(rateOf(saved, bucket.baseline), color)}
        <Text dimColor wrap="truncate">
          {bucket.turns === 0
            ? 'henüz tur yok'
            : `harcama ${usd(bucket.spent + totals.overhead)} · seçici modeliyle ${usd(bucket.baseline)} · ${bucket.turns} tur`}
        </Text>
      </Box>
    )
  }

  const shares = sharesOf(input.all)
  const cells = splitCells(shares.map(share => share.fraction), inner)
  const model = (): RenderElement => (
    <Box flexDirection="column" width={inner}>
      <Text>Model payı</Text>
      <Box width={inner} overflow="hidden">
        {shares.map((share, index) => (
          <Text color={FAMILY_COLORS[share.family]} wrap="truncate">{LINE.repeat(cells[index] ?? 0)}</Text>
        ))}
      </Box>
      <Box columnGap={2} flexWrap="wrap" width={inner}>
        {shares.map(share => (
          <Box columnGap={1}>
            <Text color={FAMILY_COLORS[share.family]}>●</Text>
            <Text>{`${FAMILY_NAMES[share.family]} ${percent(share.fraction, 1)}`}</Text>
            <Text dimColor>{`${share.turns} tur`}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  )

  // The families that ran, a column each, and the total.
  const used = FAMILIES.filter(family => input.all.families[family].turns > 0)
  const labelWidth = inner >= 60 ? 18 : 15
  const columnWidth = Math.floor((inner - labelWidth) / (used.length + 1))
  const cell = (text: string, color: string | undefined, bold = false): RenderElement => (
    <Box width={columnWidth} justifyContent="flex-end">
      {color === undefined ? <Text bold={bold}>{text}</Text> : <Text bold={bold} color={color}>{text}</Text>}
    </Box>
  )
  const row = (label: string, value: (bucket: Bucket) => string, color?: (bucket: Bucket) => string | undefined, bold = false): RenderElement => (
    <Box width={inner}>
      <Box width={labelWidth}>
        <Text dimColor={!bold} bold={bold}>{label}</Text>
      </Box>
      {used.map(family => cell(value(input.all.families[family]), color?.(input.all.families[family]), bold))}
      {cell(value(ever), color?.(ever), bold)}
    </Box>
  )
  const money = (amount: number, bucket: Bucket): string => dash(usd(amount), bucket.turns === 0)
  const gain = (bucket: Bucket): string | undefined => (savedBy(bucket) < 0 ? 'error' : savedBy(bucket) > 0 ? 'success' : undefined)

  const table = (): RenderElement => (
    <Box flexDirection="column" width={inner}>
      <Box width={inner}>
        <Box width={labelWidth}>
          <Text bold>Döküm</Text>
        </Box>
        {used.map(family => cell(FAMILY_NAMES[family], FAMILY_COLORS[family], true))}
        {cell('Toplam', undefined, true)}
      </Box>
      <Text color="inactive">{RULE.repeat(inner)}</Text>
      {row('Tur', bucket => String(bucket.turns))}
      {row('Girdi', bucket => kilo(bucket.input))}
      {row('Çıktı', bucket => kilo(bucket.output))}
      {row('Önbellek okuma', bucket => kilo(bucket.cacheRead))}
      {row('Önbelleğe yazma', bucket => kilo(bucket.cacheWrite))}
      {row('Önbellek isabeti', bucket => dash(percent(cacheHit(bucket), 1), promptOf(bucket) === 0))}
      <Text color="inactive">{RULE.repeat(inner)}</Text>
      {row('Harcama', bucket => money(bucket.spent, bucket))}
      {row('Seçici modeliyle', bucket => money(bucket.baseline, bucket))}
      {row('Tasarruf', bucket => money(savedBy(bucket), bucket), gain, true)}
    </Box>
  )

  // Where the table does not fit: a line for each family.
  const list = (): RenderElement => (
    <Box flexDirection="column" width={inner}>
      <Text bold>Döküm</Text>
      <Text dimColor>{`Önbellek isabeti ${percent(cacheHit(ever), 1)}`}</Text>
      {used.map(family => {
        const bucket = input.all.families[family]

        return (
          <Box justifyContent="space-between" width={inner}>
            <Text color={FAMILY_COLORS[family]}>{FAMILY_NAMES[family]}</Text>
            <Text dimColor>{`${bucket.turns} tur · ${usd(bucket.spent)} · tasarruf ${usd(savedBy(bucket))}`}</Text>
          </Box>
        )
      })}
    </Box>
  )

  const limits = (): RenderElement => (
    <Box flexDirection="column" width={inner}>
      <Text bold>Limitler</Text>
      <Box flexDirection="column" width={inner} gap={1}>
        {input.limits.map(limit => (
          <Box flexDirection="column" width={inner}>
            <Box justifyContent="space-between" width={inner}>
              <Text>{limit.name}</Text>
              <Text dimColor>{limit.resetsAt === '' ? `%${Math.round(limit.percentUsed)}` : `%${Math.round(limit.percentUsed)} · ${limit.resetsAt}`}</Text>
            </Box>
            {line(Math.max(0, Math.min(1, limit.percentUsed / 100)), 'suggestion')}
          </Box>
        ))}
      </Box>
    </Box>
  )

  if (ever.turns === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="promptBorder" paddingX={2} paddingY={1} gap={1} width={inner + FRAME}>
        <Text bold>Tasarruf</Text>
        <Text dimColor>Henüz kayıtlı tur yok: rakamlar gearbox bir cevap bitirdikçe birikir.</Text>
      </Box>
    )
  }

  const overhead = input.all.overhead === 0 ? '' : `gearbox'ın kendi Haiku soruları ${usd(input.all.overhead)}, tasarruftan düşüldü. `
  const since = input.since === 0 ? '' : `Sayım ${new Date(input.since).toLocaleDateString('tr-TR')} tarihinden beri. `

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="promptBorder" paddingX={2} paddingY={1} gap={1} width={inner + FRAME}>
      <Box justifyContent="space-between" width={inner}>
        <Text bold>Tasarruf</Text>
        <Text dimColor>tahmin · API liste fiyatıyla</Text>
      </Box>
      {period('Bu oturum', input.session, now)}
      {period('Toplam', input.all, ever)}
      {model()}
      {columnWidth >= MIN_COLUMN ? table() : list()}
      {input.limits.length > 0 && limits()}
      <Box flexDirection="column" width={inner}>
        <Text dimColor>Aynı tokenların seçicideki modelde ne tutacağıyla karşılaştırılır; abonelikte kota bu oranda tükenir.</Text>
        <Text dimColor>{`${overhead}${since}/gear sifirla ile sıfırlanır.`}</Text>
      </Box>
    </Box>
  )
}
