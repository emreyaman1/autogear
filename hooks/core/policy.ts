// Turns a tier into the model and effort a request goes out with: within the
// picker's ceiling, in the cache's interest, at the rate-limit windows' pace.

import { effortRank, FAMILIES, FAMILY_NAMES, familyRank, shiftEffort, type Effort, type Family } from './models'
import type { Pace } from './pacing'
import type { Override } from './signals'
import { tierSpec, type ProfileId, type Tier } from './tiers'

// What the picker holds: the most the router may spend unasked.
export type Ceiling = { family: Family; effort?: Effort }

export type Decision = {
  tier: Tier
  family: Family
  effort: Effort
  source: string
  reasons: string[]
  isClamped: boolean
}

export type PolicyInput = {
  tier: Tier
  source: string
  reasons: readonly string[]
  override?: Override
  profile: ProfileId
  ceiling: Ceiling
  previous?: { family: Family; tier: Tier }
  // The conversation's size, as the last response reported it.
  contextTokens?: number
  pace: Pace
  allowHaiku: boolean
  // Families a request has already failed on this session.
  unavailable?: readonly Family[]
}

// A model switch sends the whole conversation again without the prompt cache.
// Past this size a one-tier step changes the effort and keeps the model.
export const STICKY_CONTEXT_TOKENS = 40_000

export function decide(input: PolicyInput): Decision {
  const { override, previous, ceiling } = input
  const reasons = [...input.reasons]
  const paceReason = input.pace.reason ?? 'limit'
  let tier = override?.tier ?? input.tier
  if (input.pace.level === 'critical' && override === undefined && tier > 2) {
    tier = 2
    reasons.push(`${paceReason}: Opus yok`)
  }
  const spec = tierSpec(input.profile, tier)

  let family = spec.prefer
  if (family === 'haiku' && !input.allowHaiku) {
    family = 'sonnet'
  }
  const isDeliberate = override !== undefined || input.source === 'escalate'
  const isLargeContext = (input.contextTokens ?? 0) >= STICKY_CONTEXT_TOKENS
  if (previous !== undefined && previous.family !== family && !isDeliberate && isLargeContext && Math.abs(tier - previous.tier) < 2) {
    family = previous.family
    reasons.push('bağlam büyük: model aynı kaldı (önbellek)')
  }
  if (override?.family !== undefined) {
    family = override.family
  }
  const unavailable = input.unavailable ?? []
  if (unavailable.includes(family)) {
    // The next family up that still answers, within the picker; else the picker's own.
    const usable = FAMILIES.filter(other => !unavailable.includes(other) && familyRank(other) <= familyRank(ceiling.family))
    reasons.push(`${FAMILY_NAMES[family]} kullanılamıyor`)
    family = usable.find(other => familyRank(other) > familyRank(family)) ?? usable.at(-1) ?? ceiling.family
  }

  // A prompt's own +opus, +max or +derin outranks the picker; nothing else does.
  let isClamped = false
  if (override?.family === undefined && override?.tier === undefined && familyRank(family) > familyRank(ceiling.family)) {
    family = ceiling.family
    isClamped = true
  }

  let effort = override?.effort ?? spec.effort[family]
  if (override === undefined && input.pace.level === 'tight') {
    effort = shiftEffort(effort, -1)
    reasons.push(`${paceReason}: efor bir kademe aşağı`)
  }
  if (override === undefined && input.pace.level === 'surplus' && tier >= 2) {
    effort = shiftEffort(effort, 1)
    reasons.push(`${paceReason}: artan limit, efor bir kademe yukarı`)
  }
  const capEffort = ceiling.effort
  if (override?.effort === undefined && override?.tier === undefined && capEffort !== undefined && effortRank(effort) > effortRank(capEffort)) {
    effort = capEffort
    isClamped = true
  }
  if (isClamped) {
    reasons.push('seçici tavanı')
  }

  return { tier, family, effort, source: input.source, reasons, isClamped }
}
