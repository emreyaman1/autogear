// How the rules, Haiku's answer and the task in hand settle a prompt's tier.

import { classify, namedChoice, type ParsedPrompt, type RuleContext, type RuleResult } from './signals'
import { toTier, type Tier } from './tiers'

// The rules' reading of a prompt with the person's own choice laid over it:
// leading +tokens, or a model named in words ("bu görevi sonnet'e ver").
export function readRule(parsed: ParsedPrompt, context: RuleContext): RuleResult {
  const rule = classify(parsed.text, context)
  const named = parsed.override === undefined ? namedChoice(parsed.text) : undefined
  const override = parsed.override ?? named?.override
  if (override === undefined) {
    return rule
  }
  const why = parsed.override === undefined ? `istek: ${named?.words.join(' · ') ?? ''}` : `elle: ${parsed.tokens.join(' ')}`

  return { ...rule, confidence: 'high', source: 'override', override, reasons: [why, ...rule.reasons] }
}

// The tier of the work in hand: set by a prompt that starts or names work,
// held while the prompts that follow are no new work of their own.
export type Task = { tier: Tier } | undefined

// Prompts that settle the task: work the rules are sure of, a chore, a
// greeting, a complaint, or a choice the person made (+opus, "sonnet'e ver").
export function isFresh(rule: RuleResult): boolean {
  if (rule.source === 'override' || rule.source === 'escalate') {
    return true
  }

  return rule.confidence === 'high' && (rule.kind === 'work' || rule.kind === 'chore' || rule.kind === 'greeting' || rule.kind === 'complaint')
}

// Haiku reads the prompt alone, never the screenshot or the work around it:
// where the rules saw work, its answer goes at most one tier below theirs, and
// no lower than a floor the rules set (a request to look into something).
export function withHaiku(rule: RuleResult, haiku: Tier): { tier: Tier; reason?: string } {
  const floor = rule.floor ?? (rule.kind === 'work' ? rule.tier - 1 : 0)
  if (haiku < floor) {
    return { tier: toTier(floor), reason: `Haiku T${haiku}, kurallar T${rule.tier}: en az T${floor}` }
  }

  return { tier: haiku }
}

// A question, a remark or a prompt only Haiku could place, in the middle of
// work at T2 or above, goes at most one tier below that work.
export function holdTask(tier: Tier, rule: RuleResult, task: Task): { tier: Tier; reason?: string } {
  if (task === undefined || task.tier < 2 || isFresh(rule) || rule.source === 'inherit' || tier >= task.tier - 1) {
    return { tier }
  }

  return { tier: toTier(task.tier - 1), reason: `süren iş T${task.tier}: en çok bir kademe aşağı` }
}

export function nextTask(task: Task, rule: RuleResult, tier: Tier): Task {
  if (isFresh(rule)) {
    return { tier }
  }
  if (rule.source === 'inherit') {
    return task ?? { tier }
  }
  // Work the rules could not place raises the task, as does a prompt only Haiku
  // could place; a question leaves it.
  if (rule.kind === 'work' || rule.kind === 'none') {
    return { tier: toTier(Math.max(task?.tier ?? 0, tier)) }
  }

  return task
}

// The whole of it, for one prompt: what the router does between the rules and
// the policy, and what the eval replays over a conversation.
export function settle(
  rule: RuleResult,
  { haiku, task, carryFailure = false }: { haiku?: Tier; task: Task; carryFailure?: boolean },
): { tier: Tier; reasons: string[]; task: Task; source: string } {
  let tier = rule.tier
  let source: string = rule.source
  const reasons = [...rule.reasons]
  if (haiku !== undefined) {
    const asked = withHaiku(rule, haiku)
    tier = asked.tier
    source = 'haiku'
    reasons.push(`Haiku: T${haiku}`, ...(asked.reason === undefined ? [] : [asked.reason]))
  }
  if (carryFailure && rule.override === undefined) {
    tier = toTier(tier + 1)
    reasons.push('önceki turda test/derleme başarısız kaldı: +1 kademe')
  }
  const held = holdTask(tier, rule, task)
  if (held.reason !== undefined) {
    tier = held.tier
    reasons.push(held.reason)
  }

  return { tier, reasons, task: nextTask(task, rule, tier), source }
}
