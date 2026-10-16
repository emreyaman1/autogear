// Measures the classifier as it runs in a session, and the other ways the
// rules and Haiku could be combined. Asks Haiku about every eval prompt once;
// the answers are cached in eval/.work, so a later run asks only new prompts.
//
//   node eval/haiku.mjs
//
// The first run spends a little usage: one short Haiku call per prompt.

import { spawnSync } from 'node:child_process'

import { claudeBinary, ROOT } from '../scripts/claude.mjs'
import { askMissing, cacheKey, readCache } from './haiku-ask.mjs'

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

// Haiku's answer as the router takes it (hooks/core/settle.ts withHaiku): where
// the rules saw work, at most one tier below them, and never under their floor.
function heldHaiku(row) {
  const floor = row.floor ?? (row.kind === 'work' ? row.got - 1 : 0)

  return Math.max(row.haiku, floor)
}

// How each way of combining the two picks a tier, and whether it asks Haiku.
const POLICIES = {
  'sadece kurallar': row => ({ tier: row.got, asked: false }),
  'sadece Haiku': row => ({ tier: row.haiku, asked: true }),
  'emin değilse Haiku (0.5.0)': row => (row.confidence === 'low' ? { tier: row.haiku, asked: true } : { tier: row.got, asked: false }),
  'emin değilse Haiku, sınırlı': row => (row.confidence === 'low' ? { tier: heldHaiku(row), asked: true } : { tier: row.got, asked: false }),
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

const cache = readCache()
const sets = rulePredictions()
const all = Object.values(sets).flat()
const { asked, spent } = await askMissing(all, cache).catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
for (const row of all) {
  row.haiku = cache[cacheKey(row)] ?? row.got
}

const groups = { ...sets, 'saklanan + yeni (dürüst ölçüm)': [...sets.holdout, ...sets.fresh] }
for (const [name, rows] of Object.entries(groups)) {
  console.log(`\n${name} (n=${rows.length})`)
  for (const [label, policy] of Object.entries(POLICIES)) {
    console.log(`  ${label.padEnd(28)} ${score(rows, policy)}`)
  }
}
const chosen = POLICIES['emin değilse Haiku, sınırlı']
console.log('\nŞu anki yöntemin hataları (saklanan + yeni):')
for (const row of groups['saklanan + yeni (dürüst ölçüm)']) {
  const { tier } = chosen(row)
  if (tier !== row.tier) {
    console.log(`  T${row.tier}→T${tier} (kural T${row.got}${row.confidence === 'low' ? '?' : ''}, Haiku T${row.haiku})  ${row.text.slice(0, 70)}`)
  }
}
console.log(`\n${asked} yeni Haiku çağrısı, API liste fiyatıyla $${spent.toFixed(3)}`)
