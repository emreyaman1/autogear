// Measures the classifier as it runs in a session, and the other ways the
// rules and Haiku could be combined. Asks Haiku about every eval prompt once;
// the answers are cached in eval/.work, so a later run asks only new prompts.
//
//   node eval/haiku.mjs
//
// The first run spends a little usage: one short Haiku call per prompt.

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { claudeBinary, ROOT } from '../scripts/claude.mjs'

const llm = await import(new URL('../hooks/core/llm.ts', import.meta.url))

const WORK = join(ROOT, 'eval', '.work')
const CACHE = join(WORK, 'haiku-cache.json')

function rulePredictions() {
  const run = spawnSync(claudeBinary(), ['plugin', 'test', '.'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`
  if (!output.includes('EVALJSON')) {
    throw new Error(`plugin test printed no EVALJSON lines (exit ${run.status}): ${run.error?.message ?? output.slice(0, 500)}`)
  }
  const sets = { dev: [], holdout: [], fresh: [] }
  let current = 'dev'
  for (const line of output.split('\n')) {
    const header = /EVAL (dev|holdout|fresh):/.exec(line)
    const json = line.indexOf('EVALJSON ')
    if (json >= 0) {
      sets[current].push(JSON.parse(line.slice(json + 9)))
    } else if (header !== null) {
      current = header[1] === 'dev' ? 'holdout' : 'fresh'
    }
  }

  return sets
}

function askHaiku(item) {
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
        resolve({ tier: llm.parseTier(result.result ?? ''), cost: result.total_cost_usd ?? 0 })
      } catch {
        resolve({ tier: undefined, cost: 0 })
      }
    })
  })
}

async function pool(items, size, work) {
  let next = 0
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        await work(items[next++])
      }
    }),
  )
}

// How each way of combining the two picks a tier, and whether it asks Haiku.
const POLICIES = {
  'sadece kurallar': row => ({ tier: row.got, asked: false }),
  'sadece Haiku': row => ({ tier: row.haiku, asked: true }),
  'emin değilse Haiku': row => (row.confidence === 'low' ? { tier: row.haiku, asked: true } : { tier: row.got, asked: false }),
  'basitse Haiku teyidi': row =>
    row.confidence === 'low' || row.got <= 1 ? { tier: row.haiku, asked: true } : { tier: row.got, asked: false },
  'basitse teyit, yüksek olan': row =>
    row.confidence === 'low' || row.got <= 1 ? { tier: Math.max(row.got, row.haiku), asked: true } : { tier: row.got, asked: false },
  'her zaman, yüksek olan': row => ({ tier: Math.max(row.got, row.haiku), asked: true }),
}

function score(rows, policy) {
  const s = { exact: 0, within1: 0, under: 0, severe: 0, over: 0, asked: 0, tiers: 0 }
  for (const row of rows) {
    const { tier, asked } = policy(row)
    const gap = tier - row.tier
    s.exact += gap === 0 ? 1 : 0
    s.within1 += Math.abs(gap) <= 1 ? 1 : 0
    s.under += gap < 0 ? 1 : 0
    s.over += gap > 0 ? 1 : 0
    s.severe += gap <= -2 || (row.tier >= 3 && tier <= 1) ? 1 : 0
    s.asked += asked ? 1 : 0
    s.tiers += tier
  }
  const pct = value => `${String(Math.round((100 * value) / rows.length)).padStart(3)}%`

  return `isabet ${pct(s.exact)}  ±1 ${pct(s.within1)}  eksik ${String(s.under).padStart(2)}  ciddi ${String(s.severe).padStart(2)}  fazla ${String(s.over).padStart(2)}  Haiku'ya ${pct(s.asked)}  ort. kademe ${(s.tiers / rows.length).toFixed(2)}`
}

mkdirSync(WORK, { recursive: true })
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}
const sets = rulePredictions()
const all = Object.values(sets).flat()
const key = row => `${row.prevTier ?? '-'}|${row.text}`
const missing = all.filter(row => cache[key(row)] === undefined)
let spent = 0
await pool(missing, 6, async row => {
  const answer = await askHaiku(row)
  if (answer.tier !== undefined) {
    cache[key(row)] = answer.tier
  }
  spent += answer.cost
})
writeFileSync(CACHE, JSON.stringify(cache, null, 1))
for (const row of all) {
  row.haiku = cache[key(row)] ?? row.got
}

const groups = { ...sets, 'saklanan + yeni (dürüst ölçüm)': [...sets.holdout, ...sets.fresh] }
for (const [name, rows] of Object.entries(groups)) {
  console.log(`\n${name} (n=${rows.length})`)
  for (const [label, policy] of Object.entries(POLICIES)) {
    console.log(`  ${label.padEnd(28)} ${score(rows, policy)}`)
  }
}
const chosen = POLICIES['emin değilse Haiku']
console.log('\nŞu anki yöntemin hataları (saklanan + yeni):')
for (const row of groups['saklanan + yeni (dürüst ölçüm)']) {
  const { tier } = chosen(row)
  if (tier !== row.tier) {
    console.log(`  T${row.tier}→T${tier} (kural T${row.got}${row.confidence === 'low' ? '?' : ''}, Haiku T${row.haiku})  ${row.text.slice(0, 70)}`)
  }
}
console.log(`\n${missing.length} yeni Haiku çağrısı, API liste fiyatıyla $${spent.toFixed(3)}`)
