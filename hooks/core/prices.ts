// What a turn's tokens cost at Anthropic's published API list prices.

import type { Family } from './models'

export type Tokens = {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

type Rates = { input: number; output: number; cacheRead: number; cacheWrite: number }

// US dollars per million tokens; cache writes are the 5-minute kind (1.25x input).
// Check these against the pricing page when a new model arrives.
export const RATES: Record<Family, Rates> = {
  haiku: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  sonnet: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  opus: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  fable: { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
}

// Haiku 5.5 charges five times these rates for a prompt past 100K tokens.
const HAIKU_LONG_PROMPT = 100_000
const HAIKU_LONG_FACTOR = 5

const tokensOf = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

export function readTokens(usage: Partial<Record<keyof Tokens, unknown>>): Tokens {
  return {
    input_tokens: tokensOf(usage.input_tokens),
    output_tokens: tokensOf(usage.output_tokens),
    cache_read_input_tokens: tokensOf(usage.cache_read_input_tokens),
    cache_creation_input_tokens: tokensOf(usage.cache_creation_input_tokens),
  }
}

export function costOf(family: Family, tokens: Tokens): number {
  const rates = RATES[family]
  const prompt = tokens.input_tokens + tokens.cache_read_input_tokens + tokens.cache_creation_input_tokens
  const factor = family === 'haiku' && prompt > HAIKU_LONG_PROMPT ? HAIKU_LONG_FACTOR : 1

  return (
    factor *
    (tokens.input_tokens * rates.input +
      tokens.output_tokens * rates.output +
      tokens.cache_read_input_tokens * rates.cacheRead +
      tokens.cache_creation_input_tokens * rates.cacheWrite)
  ) / 1_000_000
}

// What a turn cost, and what the same tokens would have cost on the picker's
// model. A turn that changed model rewrote the cache; on the picker's model
// that cache would have been warm, so there the writes are priced as reads:
// the switch counts against gearbox, never for it.
export function turnMoney(answered: Family, ceiling: Family, tokens: Tokens, isSwitch: boolean): { spent: number; baseline: number } {
  const warm = isSwitch
    ? {
        ...tokens,
        cache_read_input_tokens: tokens.cache_read_input_tokens + tokens.cache_creation_input_tokens,
        cache_creation_input_tokens: 0,
      }
    : tokens

  return { spent: costOf(answered, tokens), baseline: costOf(ceiling, warm) }
}

// Dollars as a Turkish reader writes them, with the comma ("$0,38"), and more
// places for small sums.
export function usd(amount: number): string {
  const value = Math.abs(amount)
  const text = value.toFixed(value >= 0.1 ? 2 : value >= 0.01 ? 3 : 4)

  return `${amount < 0 && Number(text) !== 0 ? '-' : ''}$${text.replace('.', ',')}`
}
