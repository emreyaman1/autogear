// Measures gearbox's classifier against difficulty that other people set, on
// public benchmarks of coding-agent work, so that a new version can be judged
// before anyone runs it on their own projects:
//
//   SWE-bench Verified: 500 GitHub issues, each with the time an engineer
//   would need to fix it ("<15 min fix" … ">4 hours"), set by annotators.
//   Terminal-Bench: 241 tasks done in a terminal, each with its author's
//   estimate of the time an expert would need.
//
// Their texts are fetched into eval/.work/external and stay there. The
// benchmarks ask that their data never reach a training corpus, so none of it
// is kept in this repository, and the report names tasks by id alone.
//
//   node eval/external.mjs            the rules alone; free
//   node eval/external.mjs --haiku    Haiku asked where the rules are unsure, as gearbox does (a little usage)
//
// Time maps to tier: under 15 minutes T1, under an hour T2, under four hours
// T3, more T4. Neither set holds trivial work (T0): they test the harm that
// matters most, hard work sent to a weak model.
//
// Each set is split in two halves by a hash of the task's id, fixed for good:
// "ayar" may be looked at when the rules are changed, "saklı" never is, so
// the held-out half stays an honest measure of prompts the rules were not
// tuned on.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { claudeBinary, ROOT } from '../scripts/claude.mjs'
import { askMissing, cacheKey, pool, readCache, WORK } from './haiku-ask.mjs'

const DIR = join(WORK, 'external')
const SWE_TIERS = { '<15 min fix': 1, '15 min - 1 hour': 2, '1-4 hours': 3, '>4 hours': 4 }
const TERMINAL_BENCH = 'harbor-framework/terminal-bench-1'
const withHaiku = process.argv.includes('--haiku')

async function getJson(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'autogear-eval', accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`)
  }

  return response.json()
}

async function getText(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'autogear-eval' } })
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`)
  }

  return response.text()
}

const tierOfMinutes = minutes => (minutes < 15 ? 1 : minutes < 60 ? 2 : minutes < 240 ? 3 : 4)

// FNV-1a over the id: the same half on every machine and every run.
function halfOf(id) {
  let hash = 0x811c9dc5
  for (const char of id) {
    hash = Math.imul(hash ^ char.codePointAt(0), 0x01000193) >>> 0
  }

  return hash % 2 === 0 ? 'ayar' : 'saklı'
}

async function sweBench() {
  const file = join(DIR, 'swe-bench-verified.json')
  if (existsSync(file)) {
    return JSON.parse(readFileSync(file, 'utf8'))
  }
  const items = []
  const unknown = new Set()
  for (let offset = 0; ; offset += 100) {
    const page = await getJson(
      `https://datasets-server.huggingface.co/rows?dataset=princeton-nlp/SWE-bench_Verified&config=default&split=test&offset=${offset}&length=100`,
    )
    for (const { row } of page.rows) {
      const label = SWE_TIERS[row.difficulty]
      if (label === undefined) {
        unknown.add(row.difficulty)
      } else {
        items.push({ set: 'swe-bench', id: row.instance_id, text: row.problem_statement, label, difficulty: row.difficulty })
      }
    }
    if (page.rows.length < 100) {
      break
    }
  }
  if (unknown.size > 0) {
    console.log(`SWE-bench: zorluğu tanınmayan satırlar atlandı: ${[...unknown].join(', ')}`)
  }
  writeFileSync(file, JSON.stringify(items))

  return items
}

// The few keys of a task.yaml this needs: the instruction (a block scalar, as
// the tasks write it), the difficulty and the expert's time.
function readTask(yaml) {
  const lines = yaml.split(/\r?\n/)
  const task = {}
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^([a-z_]+):\s*(.*)$/.exec(lines[index])
    if (match === null) {
      continue
    }
    const [, key, rest] = match
    if (key === 'instruction') {
      if (/^[|>][-+]?\s*$/.test(rest)) {
        const body = []
        let next = index + 1
        for (; next < lines.length && (lines[next].trim() === '' || /^\s/.test(lines[next])); next += 1) {
          body.push(lines[next])
        }
        const indent = Math.min(...body.filter(line => line.trim() !== '').map(line => /^\s*/.exec(line)[0].length))
        task.instruction = body.map(line => line.slice(indent)).join('\n').trim()
        index = next - 1
      } else {
        task.instruction = rest.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n')
      }
    } else if (key === 'difficulty') {
      task.difficulty = rest.trim()
    } else if (key === 'expert_time_estimate_min') {
      task.minutes = Number(rest)
    }
  }

  return task
}

async function terminalBench() {
  const file = join(DIR, 'terminal-bench.json')
  if (existsSync(file)) {
    return JSON.parse(readFileSync(file, 'utf8')).items
  }
  const commit = (await getJson(`https://api.github.com/repos/${TERMINAL_BENCH}/commits/main`)).sha
  const listing = await getJson(`https://api.github.com/repos/${TERMINAL_BENCH}/contents/original-tasks?ref=${commit}`)
  const names = listing.filter(entry => entry.type === 'dir').map(entry => entry.name)
  const items = []
  let skipped = 0
  await pool(names, 8, async name => {
    try {
      const task = readTask(await getText(`https://raw.githubusercontent.com/${TERMINAL_BENCH}/${commit}/original-tasks/${name}/task.yaml`))
      if (task.instruction === undefined || !Number.isFinite(task.minutes)) {
        skipped += 1

        return
      }
      items.push({ set: 'terminal-bench', id: name, text: task.instruction, label: tierOfMinutes(task.minutes), difficulty: task.difficulty, minutes: task.minutes })
    } catch {
      skipped += 1
    }
  })
  items.sort((a, b) => a.id.localeCompare(b.id))
  if (skipped > 0) {
    console.log(`Terminal-Bench: talimatı ya da uzman süresi okunamayan ${skipped} görev atlandı`)
  }
  writeFileSync(file, JSON.stringify({ commit, items }))

  return items
}

// Classifies every item with the router's own code: a test, written for this
// run beside this script (plugin test reads neither dot folders nor files
// outside the plugin) and taken away after, that reads each text as a prompt.
function classify(items, cache) {
  const data = items.map(item => ({
    key: `${item.set}/${item.id}`,
    text: item.text,
    ...(withHaiku && cache[cacheKey(item)] !== undefined ? { haiku: cache[cacheKey(item)] } : {}),
  }))
  // The test kit reads no file over 1 MiB: the texts go in parts below that.
  const parts = [[]]
  let size = 0
  for (const entry of data) {
    const length = Buffer.byteLength(JSON.stringify(entry))
    if (size + length > 900_000 && parts.at(-1).length > 0) {
      parts.push([])
      size = 0
    }
    parts.at(-1).push(entry)
    size += length
  }
  rmSync(join(DIR, 'items.ts'), { force: true })
  parts.forEach((part, index) => {
    writeFileSync(join(DIR, `items-${index}.ts`), `export const ITEMS: { key: string; text: string; haiku?: 0 | 1 | 2 | 3 | 4 }[] = ${JSON.stringify(part)}\n`)
  })
  const imports = parts.map((_, index) => `import { ITEMS as PART_${index} } from './.work/external/items-${index}'`).join('\n')
  const testFile = join(ROOT, 'eval', 'external.generated.test.ts')
  writeFileSync(
    testFile,
    `import { test } from 'claude-code/testing'

import { readRule, withHaiku } from '../hooks/core/settle'
import { parseOverrides } from '../hooks/core/signals'
${imports}

const ITEMS = [${parts.map((_, index) => `...PART_${index}`).join(', ')}]

test('external', () => {
  for (const item of ITEMS) {
    const rule = readRule(parseOverrides(item.text), {})
    const final = rule.confidence === 'low' && item.haiku !== undefined ? withHaiku(rule, item.haiku).tier : rule.tier
    console.log(\`EXTJSON \${JSON.stringify({ key: item.key, got: rule.tier, confidence: rule.confidence, kind: rule.kind, reason: rule.reasons[0], final })}\`)
  }
})
`,
  )
  try {
    const run = spawnSync(claudeBinary(), ['plugin', 'test', '.'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    const results = new Map()
    for (const line of `${run.stdout ?? ''}\n${run.stderr ?? ''}`.split('\n')) {
      const at = line.indexOf('EXTJSON ')
      if (at >= 0) {
        const row = JSON.parse(line.slice(at + 8))
        results.set(row.key, row)
      }
    }
    if (results.size === 0) {
      const output = [run.stdout ?? '', run.stderr ?? ''].join('\n').slice(-1500)
      throw new Error(`plugin test printed no EXTJSON lines (exit ${run.status}): ${run.error?.message ?? output}`)
    }

    return results
  } finally {
    rmSync(testFile, { force: true })
  }
}

// Spearman's rank correlation, ties given their average rank.
function spearman(xs, ys) {
  const ranks = values => {
    const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value)
    const out = new Array(values.length)
    for (let start = 0; start < order.length; ) {
      let end = start
      while (end + 1 < order.length && order[end + 1].value === order[start].value) {
        end += 1
      }
      for (let k = start; k <= end; k += 1) {
        out[order[k].index] = (start + end) / 2 + 1
      }
      start = end + 1
    }

    return out
  }
  const [rx, ry] = [ranks(xs), ranks(ys)]
  const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length
  const [mx, my] = [mean(rx), mean(ry)]
  let [top, sx, sy] = [0, 0, 0]
  for (let index = 0; index < rx.length; index += 1) {
    top += (rx[index] - mx) * (ry[index] - my)
    sx += (rx[index] - mx) ** 2
    sy += (ry[index] - my) ** 2
  }

  return sx === 0 || sy === 0 ? 0 : top / Math.sqrt(sx * sy)
}

function measure(rows, pick) {
  const s = { n: rows.length, exact: 0, within1: 0, under: 0, severe: 0, over: 0, asked: 0 }
  const grid = [0, 1, 2, 3, 4].map(() => [0, 0, 0, 0, 0])
  for (const row of rows) {
    const tier = pick(row)
    const gap = tier - row.label
    s.exact += gap === 0 ? 1 : 0
    s.within1 += Math.abs(gap) <= 1 ? 1 : 0
    s.under += gap < 0 ? 1 : 0
    s.over += gap > 0 ? 1 : 0
    s.severe += gap <= -2 || (row.label >= 3 && tier <= 1) ? 1 : 0
    s.asked += row.confidence === 'low' ? 1 : 0
    grid[row.label][tier] += 1
  }
  const pct = value => `%${Math.round((100 * value) / s.n)}`
  const rho = spearman(rows.map(row => row.label), rows.map(pick))
  const lines = [
    `isabet ${pct(s.exact)} · ±1 ${pct(s.within1)} · ciddi ${s.severe} (${pct(s.severe)}) · eksik ${s.under} · fazla ${s.over} · sıra uyumu (Spearman) ${rho.toFixed(2)} · Haiku'ya sorulacak ${pct(s.asked)}`,
    '      tahmin →   T0   T1   T2   T3   T4',
    ...[1, 2, 3, 4].map(label => `      etiket T${label} ${grid[label].map(count => String(count).padStart(5)).join('')}`),
  ]

  return lines.join('\n')
}

mkdirSync(DIR, { recursive: true })
const items = [...(await sweBench()), ...(await terminalBench())]
const cache = readCache()
let note = ''
if (withHaiku) {
  // First the rules, to know where they are unsure; then Haiku, for those alone.
  const first = classify(items, cache)
  const unsure = items.filter(item => first.get(`${item.set}/${item.id}`)?.confidence === 'low')
  const answer = await askMissing(unsure, cache).catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
  note = `\n${answer.asked} yeni Haiku çağrısı (${answer.failed} başarısız), API liste fiyatıyla $${answer.spent.toFixed(3)}`
}
const results = classify(items, cache)
const rows = items.flatMap(item => {
  const result = results.get(`${item.set}/${item.id}`)

  return result === undefined ? [] : [{ ...item, ...result, half: halfOf(item.id) }]
})

const report = []
const groups = [
  ['SWE-bench Verified', row => row.set === 'swe-bench'],
  ['Terminal-Bench', row => row.set === 'terminal-bench'],
  ['ikisi, ayar yarısı', row => row.half === 'ayar'],
  ['ikisi, saklı yarı (dürüst ölçüm)', row => row.half === 'saklı'],
]
for (const [name, keep] of groups) {
  const part = rows.filter(keep)
  report.push(`\n${name} (n=${part.length})`)
  report.push(`  kurallar:\n    ${measure(part, row => row.got).split('\n').join('\n    ')}`)
  if (withHaiku) {
    report.push(`  gearbox (kurallar + emin değilse Haiku):\n    ${measure(part, row => row.final).split('\n').join('\n    ')}`)
  }
}
const pick = withHaiku ? row => row.final : row => row.got
// Only the tuning half is listed: the held-out half is not to be looked into.
const severe = rows.filter(row => row.half === 'ayar' && (pick(row) - row.label <= -2 || (row.label >= 3 && pick(row) <= 1)))
report.push(`\nAyar yarısındaki ciddi eksikler (${severe.length}), kimlik ve kuralın gerekçesi:`)
for (const row of severe.slice(0, 40)) {
  report.push(`  T${row.label}→T${pick(row)}  ${row.set}/${row.id}  [${row.reason}${row.confidence === 'low' ? ', emin değil' : ''}]`)
}
report.push(note)
const text = report.join('\n')
writeFileSync(join(WORK, 'external-report.txt'), text)
console.log(text)
