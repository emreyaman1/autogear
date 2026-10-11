// The router's settings, kept in the plugin's store and changed with /gear.

import { FAMILIES, type Family } from './models'
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
}

export const DEFAULTS: Settings = { mode: 'auto', profile: 'tasarruf', allowHaiku: true, askHaiku: true, footer: true }

export type Stats = { turns: number; byFamily: Partial<Record<Family, number>>; overrides: number; escalations: number }

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
  }
}

export function readStats(stored: unknown): Stats {
  const value = asRecord<Stats>(stored)
  const byFamily = asRecord<Record<Family, number>>(value.byFamily)

  return {
    turns: count(value.turns),
    byFamily: Object.fromEntries(FAMILIES.map(family => [family, count(byFamily[family])])),
    overrides: count(value.overrides),
    escalations: count(value.escalations),
  }
}

const ON = new Set(['ac', 'acik', 'on', 'evet', '1'])
const OFF = new Set(['kapa', 'kapat', 'kapali', 'off', 'hayir', '0'])

// What `/gear <verb> <value>` asks for: new settings, the status, or the help.
export function applyCommand(settings: Settings, verb: string, value: string): Settings | 'status' | 'help' {
  const isOn = ON.has(value) ? true : OFF.has(value) ? false : undefined
  switch (verb) {
    case '':
    case 'durum':
    case 'status':
      return 'status'
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
    default:
      return 'help'
  }
}
