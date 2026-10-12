// The router's settings, kept in the plugin's store and changed with /gear.

import { FAMILIES } from './models'
import { emptyTotals, type Bucket, type Totals } from './savings'
import { PROFILE_IDS, type ProfileId } from './tiers'

export type Settings = {
  // auto: the router picks; pin: every request goes out as the picker says.
  mode: 'auto' | 'pin'
  profile: ProfileId
  // May trivial prompts go to Haiku?
  allowHaiku: boolean
  // May the router ask Haiku when the rules cannot tell?
  askHaiku: boolean
  // Show the line beneath each answer?
  footer: boolean
  // Show the on/off band above the prompt?
  band: boolean
}

export const DEFAULTS: Settings = { mode: 'auto', profile: 'tasarruf', allowHaiku: true, askHaiku: true, footer: true, band: true }

// What is kept for good: the turn and dollar totals, how often the prompt
// chose the model, and when counting began.
export type Stats = Totals & { overrides: number; escalations: number; since: number }

type Loose<T> = Partial<Record<keyof T, unknown>>

const asRecord = <T>(value: unknown): Loose<T> => (typeof value === 'object' && value !== null ? (value as Loose<T>) : {})

const flag = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback)

const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

export function readSettings(stored: unknown): Settings {
  const value = asRecord<Settings>(stored)

  return {
    mode: value.mode === 'pin' ? 'pin' : 'auto',
    profile: PROFILE_IDS.find(id => id === value.profile) ?? DEFAULTS.profile,
    allowHaiku: flag(value.allowHaiku, DEFAULTS.allowHaiku),
    askHaiku: flag(value.askHaiku, DEFAULTS.askHaiku),
    footer: flag(value.footer, DEFAULTS.footer),
    band: flag(value.band, DEFAULTS.band),
  }
}

// The totals as stored. Before the dollar counts there were only the turns of
// each family (`byFamily`): those carry over.
function readTotals(value: Loose<Stats> & { byFamily?: unknown }): Totals {
  const totals = emptyTotals()
  const stored = asRecord<Totals['families']>(value.families)
  const turns = asRecord<Totals['families']>(value.byFamily)
  for (const family of FAMILIES) {
    const bucket = asRecord<Bucket>(stored[family])
    totals.families[family] = {
      turns: stored[family] === undefined ? count(turns[family]) : count(bucket.turns),
      spent: count(bucket.spent),
      baseline: count(bucket.baseline),
      input: count(bucket.input),
      output: count(bucket.output),
      cacheRead: count(bucket.cacheRead),
      cacheWrite: count(bucket.cacheWrite),
    }
  }
  totals.overhead = count(value.overhead)

  return totals
}

export function readStats(stored: unknown): Stats {
  const value = asRecord<Stats>(stored)

  return {
    ...readTotals(value),
    overrides: count(value.overrides),
    escalations: count(value.escalations),
    since: count(value.since),
  }
}

const ON = new Set(['ac', 'acik', 'on', 'evet', '1'])
const OFF = new Set(['kapa', 'kapat', 'kapali', 'off', 'hayir', '0'])

// What `/gear <verb> <value>` asks for: new settings, the status, or the help.
export function applyCommand(settings: Settings, verb: string, value: string): Settings | 'status' | 'savings' | 'journal' | 'mark' | 'reset' | 'help' {
  const isOn = ON.has(value) ? true : OFF.has(value) ? false : undefined
  switch (verb) {
    case '':
    case 'durum':
    case 'status':
      return 'status'
    case 'tasarruf':
    case 'savings':
    case 'kar':
      return 'savings'
    case 'kayit':
    case 'gunluk':
    case 'log':
      return 'journal'
    case 'yanlis':
    case 'wrong':
      return 'mark'
    case 'sifirla':
    case 'reset':
      return 'reset'
    case 'oto':
    case 'auto':
      return { ...settings, mode: 'auto' }
    case 'sabitle':
    case 'sabit':
    case 'pin':
      return { ...settings, mode: 'pin' }
    case 'profil':
    case 'profile': {
      const profile = PROFILE_IDS.find(id => id === value)

      return profile === undefined ? 'help' : { ...settings, profile }
    }
    case 'haiku':
      return isOn === undefined ? 'help' : { ...settings, allowHaiku: isOn }
    case 'sor':
    case 'ask':
      return isOn === undefined ? 'help' : { ...settings, askHaiku: isOn }
    case 'not':
    case 'footer':
      return isOn === undefined ? 'help' : { ...settings, footer: isOn }
    case 'bant':
    case 'band':
      return isOn === undefined ? 'help' : { ...settings, band: isOn }
    default:
      return 'help'
  }
}
