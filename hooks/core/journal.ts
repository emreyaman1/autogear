// A log of what autogear decided for each message, kept on this machine, so the
// decisions can be looked over afterwards: which ones the work itself called
// wrong (a complaint, a failing test), and which ones the person marks.

import { EFFORTS, FAMILIES, FAMILY_NAMES, familyRank, type Effort, type Family } from './models'
import { usd } from './prices'
import { flagText, L, sourceText } from './text'

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
  // Why autogear chose as it did, for looking the decision over later.
  reasons?: string[]
  // Chosen in shadow mode: written down, not applied; `answered` is the model
  // the picker held, which did answer.
  isShadow?: true
  answered?: Family
  // What autogear asked for before the picker's ceiling cut it to family and
  // effort: a need for Opus the picker hid. Absent when nothing was cut.
  wanted?: { family: Family; effort: Effort }
  // Chosen in plan mode.
  isPlanning?: true
  // The message's language and size, for a report shared without its words.
  lang?: string
  chars?: number
  words?: number
}

export const MAX_ENTRIES = 200
const SNIPPET = 100
const SHOWN = 25

// A mark as said, in the language in use when it is shown.
export const markName = (mark: Mark): string =>
  mark === 'zayif' ? L('was too weak', 'çok zayıftı') : L('was stronger than needed', 'gereğinden güçlüydü')

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
        reasons: Array.isArray(value.reasons) ? value.reasons.filter((reason): reason is string => typeof reason === 'string') : undefined,
        ...(value.isShadow === true ? { isShadow: true as const } : {}),
        ...(FAMILIES.includes(value.answered as Family) ? { answered: value.answered as Family } : {}),
        ...readWanted(value.wanted),
        ...(value.isPlanning === true ? { isPlanning: true as const } : {}),
        ...(typeof value.lang === 'string' ? { lang: value.lang } : {}),
        ...(typeof value.chars === 'number' ? { chars: num(value.chars), words: num(value.words) } : {}),
      },
    ]
  })
}

function readWanted(stored: unknown): { wanted?: Entry['wanted'] } {
  const value = record(stored)
  const family = FAMILIES.find(one => one === value.family)
  const effort = EFFORTS.find(one => one === value.effort)

  return family === undefined || effort === undefined ? {} : { wanted: { family, effort } }
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

// What a shared report says beside a decision: the setup it was made in.
export type ShareFacts = { autogear: string; claudeCode: string | undefined; profile: string }

// A decision to paste into a report of a wrong choice: everything about it but
// the message's words (its language and size only). The marked or flagged
// decision nearest the end, else the last one.
export function shareText(entries: readonly Entry[], facts: ShareFacts): string {
  const entry = [...entries].reverse().find(isDoubtful) ?? entries.at(-1)
  if (entry === undefined) {
    return L('No decision to share yet.', 'Henüz paylaşılacak bir karar yok.')
  }
  const wanted = entry.wanted === undefined ? '' : ` · wanted ${FAMILY_NAMES[entry.wanted.family]} · ${entry.wanted.effort}`
  const lines = [
    `autogear ${facts.autogear} · Claude Code ${facts.claudeCode ?? '?'} · profile ${facts.profile}`,
    `message: ${entry.lang ?? '?'} · ${entry.chars ?? '?'} chars · ${entry.words ?? '?'} words`,
    `choice: T${entry.tier} · ${FAMILY_NAMES[entry.family]} · ${entry.effort} · source ${entry.source}${entry.isShadow === true ? ' · shadow' : ''}${entry.isPlanning === true ? ' · plan mode' : ''}`,
    `picker: ${entry.ceiling === undefined ? '?' : FAMILY_NAMES[entry.ceiling]}${wanted}`,
    `why: ${(entry.reasons ?? []).join('; ') || '?'}`,
    `flags: ${entry.flags.join('; ') || 'none'} · mark: ${entry.mark ?? 'none'}`,
  ]

  return [
    L(
      'Paste this into a "Wrong model or effort" report (github.com/emreyaman1/autogear/issues). It holds no words of your message, only its language and size and the cue words the rules matched. Say there what the work really needed.',
      'Bunu bir "Wrong model or effort" kaydına yapıştırın (github.com/emreyaman1/autogear/issues). Mesajınızın hiçbir kelimesini içermez; yalnızca dilini, uzunluğunu ve kuralların eşleştiği ipucu sözlerini. Orada işin gerçekte ne istediğini yazın.',
    ),
    '',
    '```',
    ...lines,
    '```',
    '',
    L('Nothing is sent: copying it is yours to do.', 'Hiçbir şey gönderilmez: kopyalamak sizin elinizde.'),
  ].join('\n')
}

const two = (value: number): string => String(value).padStart(2, '0')

function when(at: number): string {
  const date = new Date(at)

  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const day = L(`${two(date.getMonth() + 1)}-${two(date.getDate())}`, `${two(date.getDate())}.${two(date.getMonth() + 1)}`)

  return `${day} ${two(date.getHours())}:${two(date.getMinutes())}`
}

const cell = (text: string): string => text.replace(/\|/g, '/')

const isDoubtful = (entry: Entry): boolean => entry.flags.length > 0 || entry.mark !== undefined

export function journalText(entries: readonly Entry[]): string {
  if (entries.length === 0) {
    return L(
      "**Log**\n\nNo decisions recorded yet: each message's decision is written here when its turn ends.",
      '**Günlük**\n\nHenüz kayıtlı karar yok: her mesajın kararı bir tur bitince buraya yazılır.',
    )
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
  const shadows = entries.filter(entry => entry.isShadow === true).length
  const cut = entries.filter(entry => entry.wanted !== undefined)
  const cutModel = cut.filter(entry => entry.wanted !== undefined && familyRank(entry.wanted.family) > familyRank(entry.family)).length
  const rows = entries.slice(-SHOWN).map(entry => {
    const shadow =
      entry.isShadow === true
        ? [
            L(
              `shadow, answered by: ${entry.answered === undefined ? 'the picker' : FAMILY_NAMES[entry.answered]}`,
              `gölge, cevap: ${entry.answered === undefined ? 'seçici' : FAMILY_NAMES[entry.answered]}`,
            ),
          ]
        : []
    const planning = entry.isPlanning === true ? [L('plan mode', 'plan modu')] : []
    const notes = [...planning, ...shadow, ...entry.flags.map(flagText), ...(entry.mark === undefined ? [] : [`${L('you', 'siz')}: ${markName(entry.mark)}`])].join('; ')

    const wanted = entry.wanted === undefined ? '' : ` (${L('without the ceiling', 'tavansız')} ${FAMILY_NAMES[entry.wanted.family]} · ${entry.wanted.effort})`

    return `| ${when(entry.at)} | ${cell(entry.text)} | T${entry.tier} | ${FAMILY_NAMES[entry.family]} · ${entry.effort}${wanted} | ${cell(sourceText(entry.source))} | ${notes} |`
  })
  const spent = entries.reduce((sum, entry) => sum + entry.spent, 0)
  const baseline = entries.reduce((sum, entry) => sum + entry.baseline, 0)

  return [
    L(`**Log** · last ${entries.length} decisions (at most ${MAX_ENTRIES}), kept on this machine`, `**Günlük** · son ${entries.length} karar (en çok ${MAX_ENTRIES}), bu makinede saklanır`),
    '',
    L('| Time | Message | Tier | Model · effort | Source | Note |', '| Zaman | Mesaj | Kademe | Model · efor | Kaynak | Not |'),
    '|:--|:--|:--|:--|:--|:--|',
    ...rows,
    '',
    `${L('Tiers', 'Kademeler')}: ${byTier}`,
    shadows === 0
      ? undefined
      : L(
          `Chosen in shadow and not applied: ${shadows}. The picker's model answered those; "Model · effort" is autogear's suggestion.`,
          `Gölgede seçilip uygulanmayan: ${shadows}. Onlarda cevabı seçicideki model verdi; "Model · efor" autogear'ın önerisi.`,
        ),
    cut.length === 0
      ? undefined
      : L(
          `Cut by the picker's ceiling: ${cut.length}, of which ${cutModel} wanted a stronger model. "Model · effort" is what could be applied, "without the ceiling" what autogear wanted.`,
          `Seçici tavanı yüzünden kırpılan: ${cut.length}, bunların ${cutModel} tanesinde daha güçlü bir model istenmişti. "Model · efor" uygulanabilecek olan, "tavansız" autogear'ın istediği.`,
        ),
    L(
      `Doubtful decisions: ${doubtful.length} / ${entries.length} (${Math.round((100 * doubtful.length) / entries.length)}%): raised after a complaint ${complaints}, ended with broken tests or build ${broken}, marked by you ${marked.length}.`,
      `Şüpheli kararlar: ${doubtful.length} / ${entries.length} (${Math.round((100 * doubtful.length) / entries.length)}%): şikâyetle yükseltilen ${complaints}, testi ya da derlemesi kırık biten ${broken}, sizin işaretlediğiniz ${marked.length}.`,
    ),
    L(`Spent ${usd(spent)}, ${usd(baseline)} on the picker's model.`, `Harcama ${usd(spent)}, seçici modeliyle ${usd(baseline)}.`),
    L(
      "If a decision was wrong, type `/gear wrong weak` (the model was too weak) or `/gear wrong strong` (stronger than needed); it marks the last message's decision.",
      'Bir karar yanlışsa `/gear wrong weak` (model çok zayıftı) ya da `/gear wrong strong` (gereğinden güçlüydü) yazın; son mesajın kararını işaretler.',
    ),
    L('The doubtful share is a floor: decisions that were wrong and that nobody noticed are not counted.', 'Şüpheli oranı alt sınırdır: yanlış olup kimsenin fark etmediği kararlar sayılmaz.'),
  ]
    .filter(line => line !== undefined)
    .join('\n')
}

