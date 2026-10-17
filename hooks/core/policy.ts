// Turns a tier into the model and effort a request goes out with: within the
// picker's ceiling and in the cache's interest. A rate-limit window under
// pressure lowers nothing: finishing the work matters more than the window,
// so the decision carries a warning instead.

import { effortRank, FAMILIES, FAMILY_NAMES, familyRank, shiftEffort, type Effort, type Family } from './models'
import type { Pace } from './pacing'
import type { Hunt, Override } from './signals'
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
  // The picker's model when the choice was made: what the turn would have cost without gearbox.
  ceilingModel?: string
  // The message the choice was made for; absent when no message prompted it.
  prompt?: string
  // Chosen in shadow mode: written down, not applied.
  isShadow?: true
  // A rate-limit window under pressure when the choice was made: warned about, never acted on.
  limit?: Pace
  // Made for a hunt (signals.ts): a go-ahead in its middle keeps its route.
  hunt?: Hunt
  // What the work asked for before the picker's ceiling; set only when the ceiling cut it.
  wanted?: { family: Family; effort: Effort }
  // Chosen in plan mode, by the plan-mode rule.
  isPlanning?: true
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
  // A bug described without detail, or one whose cause hides, or tests written to catch bugs.
  hunt?: Hunt
  // The session is in plan mode, as the engine's plan-mode note says.
  isPlanning?: boolean
}

// A model switch sends the whole conversation again without the prompt cache:
// the new model writes all of it once (the old model's cache is not lost; it
// lives an hour on a subscription, renewed on each read). Past this size a
// conversation never steps down to a cheaper model, since that one full write
// costs more than the saving: Sonnet writes at $2.50 a million tokens where
// Opus reads its cache at $0.20, and Haiku past 100K tokens at five times its
// price. Effort steps down instead. A step up of one tier keeps the model too;
// a bigger one, or leaving Haiku, is worth the write.
export const STICKY_CONTEXT_TOKENS = 40_000

// Room left just before a window resets lifts the effort of hard work one
// step, never as far as max: that stays the person's to ask for.
const SURPLUS_TIER = 3
const SURPLUS_TOP: Effort = 'xhigh'

// A vague hunt runs on its tier's model at high at least: Sonnet in tasarruf
// (in our own comparison Sonnet at medium passed the vague reports Opus did),
// Opus in dengeli and kalite. A located one runs on Sonnet at high, xhigh at
// T4, in every profile: Sonnet passed every such task that Opus at high did
// (the person's calls, 17 and 18 October 2026).
const HUNT_EFFORT: Effort = 'high'
const LOCATED_EFFORT = (tier: Tier): Effort => (tier >= 4 ? 'xhigh' : 'high')

// In plan mode every request goes to Opus, at an effort by the plan's size as
// the tier reads it: a small plan medium, a middling one high, a large
// many-sided one xhigh. Still within the picker.
const PLAN_EFFORT: Record<Tier, Effort> = { 0: 'medium', 1: 'medium', 2: 'medium', 3: 'high', 4: 'xhigh' }

export function decide(input: PolicyInput): Decision {
  const { override, previous, ceiling } = input
  const reasons = [...input.reasons]
  const paceReason = input.pace.reason ?? 'limit'
  const tier = override?.tier ?? input.tier
  const spec = tierSpec(input.profile, tier)

  // A model or tier the person named outranks plan mode.
  const isPlanning = input.isPlanning === true && override?.family === undefined && override?.tier === undefined
  let family: Family = isPlanning ? 'opus' : spec.prefer
  if (family === 'haiku' && !input.allowHaiku) {
    family = 'sonnet'
  }
  if (isPlanning) {
    reasons.push('plan modu: Opus, efor planın büyüklüğüne göre')
  }
  // A model or tier the person named, or plan mode, outranks a hunt's route.
  const isLocated = input.hunt === 'located' && !isPlanning && override?.family === undefined && override?.tier === undefined
  if (isLocated && familyRank(family) > familyRank('sonnet')) {
    family = 'sonnet'
  }
  if (isLocated && family === 'sonnet') {
    reasons.push('yeri belli hata avı: Sonnet')
  }
  const isDeliberate = override !== undefined || input.source === 'escalate' || isPlanning
  const isLargeContext = (input.contextTokens ?? 0) >= STICKY_CONTEXT_TOKENS
  // Haiku is for trivial work alone: a warm cache never keeps harder work on it.
  const isLeavingHaiku = previous?.family === 'haiku' && family !== 'haiku'
  const isStepDown = previous !== undefined && familyRank(family) < familyRank(previous.family)
  const isSmallStepUp = previous !== undefined && !isLeavingHaiku && Math.abs(tier - previous.tier) < 2
  if (previous !== undefined && previous.family !== family && !isDeliberate && isLargeContext && (isStepDown || isSmallStepUp)) {
    family = previous.family
    reasons.push(isStepDown ? 'bağlam büyük: daha ucuz modele inilmedi (önbellek)' : 'bağlam büyük: model aynı kaldı (önbellek)')
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

  // The effort a family gets for this work: the table's, at least high on a
  // hunt, one step more with room left before a reset.
  const effortFor = (target: Family): { effort: Effort; notes: string[] } => {
    const base = isPlanning && target === 'opus' ? PLAN_EFFORT[tier] : isLocated && target === 'sonnet' ? LOCATED_EFFORT(tier) : spec.effort[target]
    let effort = override?.effort ?? base
    const notes: string[] = []
    if (input.hunt !== undefined && override?.effort === undefined && effortRank(effort) < effortRank(HUNT_EFFORT)) {
      effort = HUNT_EFFORT
      notes.push(`hata avı: efor ${HUNT_EFFORT}`)
    }
    const raised = shiftEffort(effort, 1)
    if (override === undefined && input.pace.level === 'surplus' && tier >= SURPLUS_TIER && raised !== effort && effortRank(raised) <= effortRank(SURPLUS_TOP)) {
      effort = raised
      notes.push(`${paceReason}: artan limit, efor bir kademe yukarı`)
    }

    return { effort, notes }
  }

  // What the work asks for before the picker's ceiling, so a log can show a
  // need the picker hid. A prompt's own +opus, +max or +derin outranks the
  // picker; nothing else does.
  const wantedFamily = family
  let isClamped = false
  if (override?.family === undefined && override?.tier === undefined && familyRank(family) > familyRank(ceiling.family)) {
    family = ceiling.family
    isClamped = true
  }
  const shaped = effortFor(family)
  reasons.push(...shaped.notes)
  let effort = shaped.effort
  const capEffort = ceiling.effort
  if (override?.effort === undefined && override?.tier === undefined && capEffort !== undefined && effortRank(effort) > effortRank(capEffort)) {
    effort = capEffort
    isClamped = true
  }
  if (isClamped) {
    reasons.push('seçici tavanı')
  }
  const wanted = isClamped ? { family: wantedFamily, effort: effortFor(wantedFamily).effort } : undefined

  const isPressed = input.pace.level === 'critical' || input.pace.level === 'tight'

  return {
    tier,
    family,
    effort,
    source: input.source,
    reasons,
    isClamped,
    ...(wanted === undefined ? {} : { wanted }),
    ...(isPressed ? { limit: input.pace } : {}),
    ...(input.hunt === undefined ? {} : { hunt: input.hunt }),
    ...(isPlanning ? { isPlanning: true as const } : {}),
  }
}
