// What Haiku is asked when the rules cannot place a prompt.

import type { Tier } from './tiers'

export const RUBRIC = `You route requests sent to a coding agent to a capability tier.
Answer with exactly one of T0, T1, T2, T3, T4 and nothing else.

T0 trivial: a question about code already in view, a commit message, a rename, a typo, formatting.
T1 routine: a small, clearly specified change in one place.
T2 standard: ordinary feature work, writing tests, debugging with a clear error message.
T3 hard: unclear root cause, architecture or design decisions, large refactors, performance, concurrency, security.
T4 critical: long multi-step work across many files, or a task that has already failed several times.

When torn between two tiers, answer the higher one. Requests are often written in Turkish.`

export function classifierPrompt(text: string, previous?: Tier): string {
  const head = previous === undefined ? '' : `The previous request in this conversation was T${previous}.\n`

  return `${head}Request:\n<<<\n${text.slice(0, 4000)}\n>>>`
}

export function parseTier(reply: string): Tier | undefined {
  const match = /T([0-4])/.exec(reply)

  return match === null ? undefined : (Number(match[1]) as Tier)
}
