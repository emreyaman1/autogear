// Model families and effort levels, each ordered from cheapest to most capable.

export const FAMILIES = ['haiku', 'sonnet', 'opus', 'fable'] as const
export type Family = (typeof FAMILIES)[number]

export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const
export type Effort = (typeof EFFORTS)[number]

// The id a request is sent with when the router names a family other than
// the one the session already runs on.
export const MODEL_IDS: Record<Family, string> = {
  haiku: 'claude-haiku-5-5',
  sonnet: 'claude-sonnet-5-5',
  opus: 'claude-opus-5-5',
  fable: 'claude-fable-5-1',
}

export const FAMILY_NAMES: Record<Family, string> = {
  haiku: 'Haiku',
  sonnet: 'Sonnet',
  opus: 'Opus',
  fable: 'Fable',
}

export function familyOf(model: string | undefined): Family | undefined {
  const id = model?.toLowerCase() ?? ''

  return FAMILIES.find(family => id.includes(family))
}

export function asEffort(value: unknown): Effort | undefined {
  return EFFORTS.find(effort => effort === value)
}

export const familyRank = (family: Family): number => FAMILIES.indexOf(family)

export const effortRank = (effort: Effort): number => EFFORTS.indexOf(effort)

export function shiftEffort(effort: Effort, steps: number): Effort {
  const rank = Math.max(0, Math.min(EFFORTS.length - 1, effortRank(effort) + steps))

  return EFFORTS[rank] ?? effort
}

// "claude-sonnet-5-5" reads "Sonnet 5.5"; an id it cannot read comes back as given.
export function displayModel(model: string): string {
  const match = /(haiku|sonnet|opus|fable|mythos)-(\d+)(?:-(\d{1,2})(?!\d))?/i.exec(model)
  if (match === null) {
    return model
  }
  const [, name = '', major = '', minor] = match
  const title = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()

  return minor === undefined ? `${title} ${major}` : `${title} ${major}.${minor}`
}
