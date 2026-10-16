// Output quality: runs each task in eval/tasks through Claude Code headless,
// in a fresh copy of a small project, then checks the result with tests
// Claude never saw. Whether a step was right is the hidden tests' call, not
// the model's own report.
//
// The same tasks run under each arm, so gearbox is compared with what people
// would use without it:
//
//   node eval/tasks.mjs gearbox            gearbox picks (picker: Opus · high)
//   node eval/tasks.mjs opus-high          no gearbox, every task on Opus · high
//   node eval/tasks.mjs opus-medium        Opus at its default effort, what a Pro plan runs
//   node eval/tasks.mjs sonnet-medium      Sonnet at its default effort
//   node eval/tasks.mjs opusplan           the opusplan model setting (Opus in plan mode, Sonnet otherwise)
//   node eval/tasks.mjs sonnet-advisor     Sonnet · medium with Opus as its advisor
//   node eval/tasks.mjs gearbox --runs 3 3-coupon 5-report    three runs, only these tasks
//   node eval/tasks.mjs report             the arms measured so far, side by side (free)
//
// Every arm but report spends usage: a few model calls per task and run.
// Opus · medium against Opus · high, and Sonnet · medium against Opus ·
// medium, part how much of a difference comes from the effort and how much
// from the model.

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { familyOf, requireVersion, ROOT, runClaude } from '../scripts/claude.mjs'

const TASKS = join(ROOT, 'eval', 'tasks')
const WORK = join(ROOT, 'eval', '.work')

const ARMS = {
  gearbox: { plugin: ROOT, model: 'opus', effort: 'high' },
  'opus-high': { plugin: null, model: 'opus', effort: 'high' },
  'opus-medium': { plugin: null, model: 'opus', effort: 'medium' },
  'sonnet-medium': { plugin: null, model: 'sonnet', effort: 'medium' },
  opusplan: { plugin: null, model: 'opusplan', effort: 'medium' },
  'sonnet-advisor': { plugin: null, model: 'sonnet', effort: 'medium', settings: { advisorModel: 'opus' } },
}

// Before arms had names: "baseline" was Opus · high.
const arm = process.argv[2] === 'baseline' ? 'opus-high' : (process.argv[2] ?? 'gearbox')
const runsAt = process.argv.indexOf('--runs')
const runs = runsAt > 0 ? Math.max(1, Number(process.argv[runsAt + 1]) || 1) : 1
const only = process.argv.slice(3).filter((value, index, all) => value !== '--runs' && all[index - 1] !== '--runs')
const tasks = JSON.parse(readFileSync(join(TASKS, 'tasks.json'), 'utf8')).filter(task => only.length === 0 || only.includes(task.name))

const TOOLS = ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash(node --test:*)', 'Bash(npm test:*)', 'Bash(npm run test:*)']

function report() {
  const rows = []
  for (const name of Object.keys(ARMS)) {
    const file = join(WORK, `tasks-${name}.json`)
    if (!existsSync(file)) {
      continue
    }
    const results = JSON.parse(readFileSync(file, 'utf8'))
    const passed = results.filter(result => result.passed).length
    const spent = results.reduce((sum, result) => sum + result.cost, 0)
    const seconds = results.reduce((sum, result) => sum + result.seconds, 0)
    rows.push(`| ${name} | ${passed}/${results.length} | $${spent.toFixed(2)} | ${seconds} sn |`)
    for (const task of [...new Set(results.map(result => result.name))]) {
      const mine = results.filter(result => result.name === task)
      rows.push(`|   ${task} | ${mine.filter(result => result.passed).length}/${mine.length} | $${mine.reduce((sum, result) => sum + result.cost, 0).toFixed(3)} | ${[...new Set(mine.flatMap(result => result.models))].join('+')} |`)
    }
  }
  console.log(rows.length === 0 ? 'Henüz ölçülmüş kol yok.' : ['| Kol / görev | Geçen | Maliyet (liste fiyatı) | Süre / modeller |', '|:--|:--|:--|:--|', ...rows].join('\n'))
}

if (arm === 'report') {
  report()
  process.exit(0)
}
const setup = ARMS[arm]
if (setup === undefined) {
  console.error(`Bilinmeyen kol: ${arm}. Kollar: ${Object.keys(ARMS).join(', ')}, report.`)
  process.exit(1)
}
const { binary, version } = requireVersion()
console.log(`${arm} · ${tasks.length} görev × ${runs} çalıştırma · ${version} (${binary})`)

const results = []
for (let run = 1; run <= runs; run += 1) {
  for (const task of tasks) {
    const work = mkdtempSync(join(tmpdir(), `gearbox-${task.name}-`))
    cpSync(join(TASKS, '_fixture'), work, { recursive: true })
    const overlay = join(TASKS, task.name, 'overlay')
    if (existsSync(overlay)) {
      cpSync(overlay, work, { recursive: true })
    }
    const extra = ['--permission-mode', 'acceptEdits', '--allowedTools', ...TOOLS, ...(setup.settings === undefined ? [] : ['--settings', JSON.stringify(setup.settings)])]
    const answer = runClaude(task.prompt, { cwd: work, plugin: setup.plugin, model: setup.model, effort: setup.effort, extra })
    cpSync(join(TASKS, task.name, 'hidden'), join(work, 'test'), { recursive: true })
    // Each check has a time limit, so a test that hangs ends the check, not the machine's patience.
    const check = spawnSync(process.execPath, ['--test'], { cwd: work, encoding: 'utf8', timeout: 180_000 })
    const passed = check.status === 0
    const failures = passed ? '' : check.error !== undefined ? `kontrol bitmedi: ${check.error.message}` : (check.stdout.match(/^not ok .*$/gm) ?? []).join('; ')
    const models = answer.models.map(familyOf)
    results.push({ name: task.name, kind: task.kind, tier: task.tier, run, models, cost: answer.cost, turns: answer.turns, seconds: Math.round(answer.durationMs / 1000), passed, failures })
    console.log(
      `${passed ? 'GEÇTİ' : 'KALDI'}  ${task.name.padEnd(14)} #${run} ${(models.join('+') || '-').padEnd(14)} $${answer.cost.toFixed(3)}  ${String(answer.turns).padStart(2)} adım  ${String(Math.round(answer.durationMs / 1000)).padStart(3)} sn` +
        (failures === '' ? '' : `  | ${failures.slice(0, 200)}`) +
        (answer.isError ? `  | claude: ${(answer.error ?? answer.text).slice(0, 200)}` : ''),
    )
    rmSync(work, { recursive: true, force: true })
  }
}

mkdirSync(WORK, { recursive: true })
writeFileSync(join(WORK, `tasks-${arm}.json`), JSON.stringify(results, null, 2))
const passed = results.filter(result => result.passed).length
const spent = results.reduce((sum, result) => sum + result.cost, 0)
console.log(`\n${arm}: ${passed}/${results.length} geçti, API liste fiyatıyla toplam $${spent.toFixed(3)}`)
