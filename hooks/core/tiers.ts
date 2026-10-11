// How much model each tier of work gets, per profile.

import type { Effort, Family } from './models'

export type Tier = 0 | 1 | 2 | 3 | 4

export type TierSpec = {
  label: string
  // The family the tier runs on when nothing holds it back.
  prefer: Family
  // The effort paired with each family, so a tier held on another family
  // (by the picker, or by a warm cache) still gets a matching amount of work.
  effort: Record<Family, Effort>
}

export const PROFILE_IDS = ['tasarruf', 'dengeli', 'kalite'] as const
export type ProfileId = (typeof PROFILE_IDS)[number]

const row = (
  label: string,
  prefer: Family,
  haiku: Effort,
  sonnet: Effort,
  opus: Effort,
  fable: Effort,
): TierSpec => ({ label, prefer, effort: { haiku, sonnet, opus, fable } })

// tasarruf fits Pro's tight windows: Opus only for hard work, at its default
// effort; dengeli and kalite spend more for Max plans.
export const PROFILES: Record<ProfileId, readonly TierSpec[]> = {
  //       label        prefer     haiku     sonnet    opus      fable
  tasarruf: [
    row('önemsiz', 'haiku', 'low', 'low', 'low', 'low'),
    row('rutin', 'sonnet', 'medium', 'medium', 'low', 'low'),
    row('standart', 'sonnet', 'high', 'high', 'medium', 'low'),
    row('zor', 'opus', 'xhigh', 'xhigh', 'medium', 'medium'),
    row('kritik', 'opus', 'max', 'max', 'high', 'medium'),
  ],
  dengeli: [
    row('önemsiz', 'haiku', 'low', 'low', 'low', 'low'),
    row('rutin', 'sonnet', 'medium', 'medium', 'low', 'low'),
    row('standart', 'sonnet', 'high', 'high', 'medium', 'medium'),
    row('zor', 'opus', 'xhigh', 'xhigh', 'high', 'medium'),
    row('kritik', 'opus', 'max', 'max', 'xhigh', 'high'),
  ],
  kalite: [
    row('önemsiz', 'sonnet', 'low', 'low', 'low', 'low'),
    row('rutin', 'sonnet', 'medium', 'high', 'medium', 'low'),
    row('standart', 'opus', 'high', 'xhigh', 'medium', 'medium'),
    row('zor', 'opus', 'max', 'max', 'high', 'high'),
    row('kritik', 'opus', 'max', 'max', 'max', 'xhigh'),
  ],
}

export function toTier(value: number): Tier {
  return Math.max(0, Math.min(4, Math.round(value))) as Tier
}

export function tierSpec(profile: ProfileId, tier: Tier): TierSpec {
  const spec = PROFILES[profile][tier]
  if (spec === undefined) {
    throw new Error(`gearbox: profile ${profile} has no tier ${tier}`)
  }

  return spec
}
