// Asking Haiku the router's question from a script, with the answers cached in
// eval/.work so that a prompt is asked once. Shared by eval/haiku.mjs and
// eval/external.mjs.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { claudeBinary, ROOT } from '../scripts/claude.mjs'

const llm = await import(new URL('../hooks/core/llm.ts', import.meta.url))

export const WORK = join(ROOT, 'eval', '.work')
const CACHE = join(WORK, 'haiku-cache.json')

export const cacheKey = item => `${item.prevTier ?? '-'}|${item.text}`

export function readCache() {
  return existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}
}

export function writeCache(cache) {
  mkdirSync(WORK, { recursive: true })
  writeFileSync(CACHE, JSON.stringify(cache, null, 1))
}

// One question, as the router asks it in a session: the rubric, the prompt,
// Haiku at low effort, no tools. Resolves the tier (or undefined), the cost,
// and the error when the call failed (a session that needs a login, say).
export function askHaiku(item) {
  const args = [
    '-p', llm.classifierPrompt(item.text, item.prevTier),
    '--model', 'claude-haiku-5-5', '--effort', 'low', '--tools', '', '--system-prompt', llm.RUBRIC,
    '--output-format', 'json', '--setting-sources', 'project',
  ]

  return new Promise(resolve => {
    const child = spawn(claudeBinary(), args, { cwd: ROOT })
    let out = ''
    child.stdout.on('data', chunk => (out += chunk))
    child.on('close', () => {
      try {
        const result = JSON.parse(out)
        if (result.is_error === true) {
          resolve({ tier: undefined, cost: result.total_cost_usd ?? 0, error: String(result.result ?? 'is_error') })

          return
        }
        resolve({ tier: llm.parseTier(result.result ?? ''), cost: result.total_cost_usd ?? 0 })
      } catch {
        resolve({ tier: undefined, cost: 0, error: out.trim().slice(0, 300) || 'no output' })
      }
    })
  })
}

export async function pool(items, size, work) {
  let next = 0
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        await work(items[next++])
      }
    }),
  )
}

// Asks Haiku about every item the cache has no answer for; returns what it
// cost. Stops at the first call that fails for want of a login, and says so.
export async function askMissing(items, cache) {
  const missing = items.filter(item => cache[cacheKey(item)] === undefined)
  if (missing.length > 0) {
    const probe = await askHaiku(missing[0])
    if (probe.error !== undefined) {
      throw new Error(`Haiku'ya sorulamadı: ${probe.error}\nBir terminalde \`claude auth login\` ile giriş yapıp yeniden çalıştırın.`)
    }
    if (probe.tier !== undefined) {
      cache[cacheKey(missing[0])] = probe.tier
    }
  }
  let spent = 0
  let failed = 0
  await pool(missing.slice(1), 6, async item => {
    const answer = await askHaiku(item)
    if (answer.tier !== undefined) {
      cache[cacheKey(item)] = answer.tier
    }
    failed += answer.error === undefined ? 0 : 1
    spent += answer.cost
  })
  writeCache(cache)

  return { asked: missing.length, spent, failed }
}
