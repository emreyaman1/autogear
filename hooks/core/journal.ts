// A log of what gearbox decided for each message, kept on this machine, so the
// decisions can be looked over afterwards: which ones the work itself called
// wrong (a complaint, a failing test), and which ones the person marks.

import { FAMILIES, FAMILY_NAMES, type Effort, type Family } from './models'
import { usd } from './prices'

export type Mark = 'zayif' | 'fazla'

export type Entry = {
  at: number
  // The start of the message, enough to recognise it.
  text: string
  tier: number
  family: Family
  effort: Effort
  source: string
  // The picker's model when the choice was made.
  ceiling: Family | undefined
  spent: number
  baseline: number
  // What the work said about the choice: "şikâyetle yükseltildi", "test/derleme kırık".
  flags: string[]
  // What the person said: the model was too weak, or more than the work needed.
  mark: Mark | undefined
}

export const MAX_ENTRIES = 200
const SNIPPET = 100
const SHOWN = 25

const MARK_NAMES: Record<Mark, string> = { zayif: 'çok zayıftı', fazla: 'gereğinden güçlüydü' }

const record = (value: unknown): Record<string, unknown> => (typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {})

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

export const snippet = (text: string): string => {
  const flat = text.replace(/\s+/g, ' ').trim()

  return flat.length > SNIPPET ? `${flat.slice(0, SNIPPET)}…` : flat
}

export function readJournal(stored: unknown): Entry[] {
  if (!Array.isArray(stored)) {
    return []
  }

  return stored.flatMap((raw): Entry[] => {
    const value = record(raw)
    const family = FAMILIES.find(one => one === value.family)
    if (family === undefined || typeof value.text !== 'string') {
      return []
    }

    return [
      {
        at: num(value.at),
        text: value.text,
        tier: num(value.tier),
        family,
        effort: (typeof value.effort === 'string' ? value.effort : 'low') as Effort,
        source: typeof value.source === 'string' ? value.source : '',
        ceiling: FAMILIES.find(one => one === value.ceiling),
        spent: num(value.spent),
        baseline: num(value.baseline),
        flags: Array.isArray(value.flags) ? value.flags.filter((flag): flag is string => typeof flag === 'string') : [],
        mark: value.mark === 'zayif' || value.mark === 'fazla' ? value.mark : undefined,
      },
    ]
  })
}

export function addEntry(entries: Entry[], entry: Entry): void {
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES)
  }
}

// The latest message's entry is the one a complaint or a mark is about.
export function flagLast(entries: Entry[], flag: string): void {
  const last = entries.at(-1)
  if (last !== undefined && !last.flags.includes(flag)) {
    last.flags.push(flag)
  }
}

export function markLast(entries: Entry[], mark: Mark): Entry | undefined {
  const last = entries.at(-1)
  if (last !== undefined) {
    last.mark = mark
  }

  return last
}

const two = (value: number): string => String(value).padStart(2, '0')

function when(at: number): string {
  const date = new Date(at)

  return Number.isNaN(date.getTime()) ? '' : `${two(date.getDate())}.${two(date.getMonth() + 1)} ${two(date.getHours())}:${two(date.getMinutes())}`
}

const cell = (text: string): string => text.replace(/\|/g, '/')

const isDoubtful = (entry: Entry): boolean => entry.flags.length > 0 || entry.mark !== undefined

export function journalText(entries: readonly Entry[]): string {
  if (entries.length === 0) {
    return '**gearbox günlüğü**\n\nHenüz kayıtlı karar yok: her mesajın kararı bir tur bitince buraya yazılır.'
  }
  const doubtful = entries.filter(isDoubtful)
  const marked = entries.filter(entry => entry.mark !== undefined)
  const complaints = entries.filter(entry => entry.flags.includes('şikâyetle yükseltildi')).length
  const broken = entries.filter(entry => entry.flags.includes('test/derleme kırık')).length
  const byTier = [0, 1, 2, 3, 4]
    .map(tier => [tier, entries.filter(entry => entry.tier === tier).length] as const)
    .filter(([, total]) => total > 0)
    .map(([tier, total]) => `T${tier} ${total}`)
    .join(' · ')
  const rows = entries.slice(-SHOWN).map(entry => {
    const notes = [...entry.flags, ...(entry.mark === undefined ? [] : [`siz: ${MARK_NAMES[entry.mark]}`])].join('; ')

    return `| ${when(entry.at)} | ${cell(entry.text)} | T${entry.tier} | ${FAMILY_NAMES[entry.family]} · ${entry.effort} | ${cell(entry.source)} | ${notes} |`
  })
  const spent = entries.reduce((sum, entry) => sum + entry.spent, 0)
  const baseline = entries.reduce((sum, entry) => sum + entry.baseline, 0)

  return [
    `**gearbox günlüğü** · son ${entries.length} karar (en çok ${MAX_ENTRIES}), bu makinede saklanır`,
    '',
    '| Zaman | Mesaj | Kademe | Model · efor | Kaynak | Not |',
    '|:--|:--|:--|:--|:--|:--|',
    ...rows,
    '',
    `Kademeler: ${byTier}`,
    `Şüpheli kararlar: ${doubtful.length} / ${entries.length} (${Math.round((100 * doubtful.length) / entries.length)}%): şikâyetle yükseltilen ${complaints}, testi ya da derlemesi kırık biten ${broken}, sizin işaretlediğiniz ${marked.length}.`,
    `Harcama ${usd(spent)}, seçici modeliyle ${usd(baseline)}.`,
    'Bir karar yanlışsa `/gear yanlis zayif` (model çok zayıftı) ya da `/gear yanlis fazla` (gereğinden güçlüydü) yazın; son mesajın kararını işaretler.',
    'Şüpheli oranı alt sınırdır: yanlış olup kimsenin fark etmediği kararlar sayılmaz.',
  ].join('\n')
}

export { MARK_NAMES }
