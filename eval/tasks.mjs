// Output quality: runs each task in eval/tasks through Claude Code headless,
// in a fresh copy of a small project, then checks the result with tests
// Claude never saw. Whether a step was right is the hidden tests' call, not
// the model's own report.
//
//   node eval/tasks.mjs              gearbox picks the model (picker: Opus · high)
//   node eval/tasks.mjs baseline     no gearbox: every task on Opus · high
//   node eval/tasks.mjs gearbox 3-coupon 5-report     only these tasks
//
// It spends usage: a few model calls per task.

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { familyOf, ROOT, runClaude } from '../scripts/claude.mjs'

const TASKS = join(ROOT, 'eval', 'tasks')
const mode = process.argv[2] === 'baseline' ? 'baseline' : 'gearbox'
const only = process.argv.slice(3)
const tasks = JSON.parse(readFileSync(join(TASKS, 'tasks.json'), 'utf8')).filter(task => only.length === 0 || only.includes(task.name))

const TOOLS = ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash(node --test:*)', 'Bash(npm test:*)', 'Bash(npm run test:*)']

const results = []
for (const task of tasks) {
  const work = mkdtempSync(join(tmpdir(), `gearbox-${task.name}-`))
  cpSync(join(TASKS, '_fixture'), work, { recursive: true })
  const overlay = join(TASKS, task.name, 'overlay')
  if (existsSync(overlay)) {
    cpSync(overlay, work, { recursive: true })
  }
  const run = runClaude(task.prompt, {
    cwd: work,
    plugin: mode === 'gearbox' ? ROOT : null,
    model: 'opus',
    effort: 'high',
    extra: ['--permission-mode', 'acceptEdits', '--allowedTools', ...TOOLS],
  })
  cpSync(join(TASKS, task.name, 'hidden'), join(work, 'test'), { recursive: true })
  const check = spawnSync(process.execPath, ['--test'], { cwd: work, encoding: 'utf8' })
  const passed = check.status === 0
  const failures = passed ? '' : (check.stdout.match(/^not ok .*$/gm) ?? []).join('; ')
  const models = run.models.map(familyOf)
  results.push({ name: task.name, tier: task.tier, models, cost: run.cost, turns: run.turns, seconds: Math.round(run.durationMs / 1000), passed, failures })
  console.log(
    `${passed ? 'GEÇTİ' : 'KALDI'}  ${task.name.padEnd(12)} ${(models.join('+') || '-').padEnd(14)} $${run.cost.toFixed(3)}  ${String(run.turns).padStart(2)} adım  ${String(Math.round(run.durationMs / 1000)).padStart(3)} sn` +
      (failures === '' ? '' : `  | ${failures.slice(0, 200)}`) +
      (run.isError ? `  | claude: ${(run.error ?? run.text).slice(0, 200)}` : ''),
  )
  rmSync(work, { recursive: true, force: true })
}

mkdirSync(join(ROOT, 'eval', '.work'), { recursive: true })
writeFileSync(join(ROOT, 'eval', '.work', `tasks-${mode}.json`), JSON.stringify(results, null, 2))
const passed = results.filter(result => result.passed).length
const spent = results.reduce((sum, result) => sum + result.cost, 0)
console.log(`\n${mode}: ${passed}/${results.length} görev geçti, API liste fiyatıyla toplam $${spent.toFixed(3)}`)
