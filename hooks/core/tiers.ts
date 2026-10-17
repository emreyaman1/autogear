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

// tasarruf fits Pro's tight windows: Opus only for critical work, plan mode
// (policy.ts) and when the person asks; dengeli and kalite spend more for Max
// plans.
//
// Clearly described routine and standard work runs on Sonnet at medium in
// every profile: in the measurements behind this table Sonnet medium did that
// work as well as Opus high for a fraction of the cost, and raising Sonnet's
// effort on it did not help. In tasarruf hard work runs on Sonnet at high too:
// in autogear's own comparison (twenty tasks, two of them sets, one run each)
// Opus solved none that Sonnet at medium failed, at 3.6 times the cost (the
// person's call, 18 October 2026). No tier defaults to max; only the person
// asks for it (+max, "max ile"). A hunt (policy.ts) runs at high at least.
export const PROFILES: Record<ProfileId, readonly TierSpec[]> = {
  //       label        prefer     haiku     sonnet    opus      fable
  tasarruf: [
    row('önemsiz', 'haiku', 'low', 'low', 'low', 'low'),
    row('rutin', 'sonnet', 'medium', 'medium', 'low', 'low'),
    row('standart', 'sonnet', 'high', 'medium', 'medium', 'low'),
    row('zor', 'sonnet', 'xhigh', 'high', 'medium', 'medium'),
    row('kritik', 'opus', 'xhigh', 'xhigh', 'high', 'medium'),
  ],
  dengeli: [
    row('önemsiz', 'haiku', 'low', 'low', 'low', 'low'),
    row('rutin', 'sonnet', 'medium', 'medium', 'low', 'low'),
    row('standart', 'sonnet', 'high', 'medium', 'medium', 'medium'),
    row('zor', 'opus', 'xhigh', 'xhigh', 'high', 'medium'),
    row('kritik', 'opus', 'xhigh', 'xhigh', 'xhigh', 'high'),
  ],
  kalite: [
    row('önemsiz', 'sonnet', 'low', 'low', 'low', 'low'),
    row('rutin', 'sonnet', 'medium', 'medium', 'medium', 'low'),
    row('standart', 'opus', 'high', 'medium', 'medium', 'medium'),
    row('zor', 'opus', 'xhigh', 'xhigh', 'high', 'high'),
    row('kritik', 'opus', 'xhigh', 'xhigh', 'xhigh', 'xhigh'),
  ],
}

export function toTier(value: number): Tier {
  return Math.max(0, Math.min(4, Math.round(value))) as Tier
}

export function tierSpec(profile: ProfileId, tier: Tier): TierSpec {
  const spec = PROFILES[profile][tier]
  if (spec === undefined) {
    throw new Error(`autogear: profile ${profile} has no tier ${tier}`)
  }

  return spec
}
