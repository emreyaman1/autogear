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
//   node eval/tasks.mjs gearbox-0.8.1      gearbox as it was before the hunt split (hunts on Opus · high)
//   node eval/tasks.mjs report             the arms measured so far, side by side (free)
//
// --set sqlglot runs the tasks of eval/tasks/sqlglot.json instead: real bugs
// of sqlglot, a 100K-line SQL parser, each set up as the code stood just
// before its fix (no git history, so the fix cannot be looked up) and checked
// by the tests that fix added. It needs sqlglot cloned into
// eval/.work/repos/sqlglot and Python 3.9 or newer.
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
const REPOS = join(WORK, 'repos')

// The commit whose gearbox still sent every hunt to Opus · high (0.8.1).
const OLD_GEARBOX = { commit: '49ddf2d', folder: join(WORK, 'gearbox-0.8.1') }

const ARMS = {
  gearbox: { plugin: ROOT, model: 'opus', effort: 'high' },
  'opus-high': { plugin: null, model: 'opus', effort: 'high' },
  'opus-medium': { plugin: null, model: 'opus', effort: 'medium' },
  'sonnet-medium': { plugin: null, model: 'sonnet', effort: 'medium' },
  opusplan: { plugin: null, model: 'opusplan', effort: 'medium' },
  'sonnet-advisor': { plugin: null, model: 'sonnet', effort: 'medium', settings: { advisorModel: 'opus' } },
  'gearbox-0.8.1': { plugin: OLD_GEARBOX.folder, model: 'opus', effort: 'high' },
}

const flag = name => {
  const at = process.argv.indexOf(name)

  return at > 0 ? process.argv[at + 1] : undefined
}

// Before arms had names: "baseline" was Opus · high.
const arm = process.argv[2] === 'baseline' ? 'opus-high' : (process.argv[2] ?? 'gearbox')
const runs = Math.max(1, Number(flag('--runs')) || 1)
const set = flag('--set') ?? 'small'
const only = process.argv.slice(3).filter((value, index, all) => !value.startsWith('--') && !all[index - 1]?.startsWith('--'))
const tasks = JSON.parse(readFileSync(join(TASKS, set === 'small' ? 'tasks.json' : `${set}.json`), 'utf8')).filter(task => only.length === 0 || only.includes(task.name))
const resultsOf = name => join(WORK, set === 'small' ? `tasks-${name}.json` : `tasks-${set}-${name}.json`)

const TOOLS = ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash(node --test:*)', 'Bash(npm test:*)', 'Bash(npm run test:*)', 'Bash(python -m unittest:*)', 'Bash(python -m pytest:*)']

const git = (args, options = {}) => spawnSync('git', ['-C', join(REPOS, set), ...args], { maxBuffer: 1024 * 1024 * 1024, ...options })

// The project as it stood just before the fix, exported without its history.
function prepareRepoTask(task, work) {
  const archive = git(['archive', '--format=tar', `${task.commit}^`])
  if (archive.status !== 0) {
    throw new Error(`git archive ${task.commit}^: ${archive.stderr}`)
  }
  spawnSync('tar', ['-x', '-C', work], { input: archive.stdout, maxBuffer: 1024 * 1024 * 1024 })
}

// The tests the fix added, laid over Claude's work and run: the hidden check.
function checkRepoTask(task, work) {
  const files = git(['show', '--name-only', '--format=', task.commit, '--', 'tests'], { encoding: 'utf8' })
    .stdout.split('\n')
    .filter(file => file !== '' && !file.endsWith('__init__.py'))
  for (const file of files) {
    writeFileSync(join(work, file), git(['show', `${task.commit}:${file}`]).stdout)
  }
  const modules = files.filter(file => file.endsWith('.py')).map(file => file.replace(/\.py$/, '').replaceAll('/', '.'))
  if (files.some(file => file.includes('fixtures/optimizer'))) {
    modules.push('tests.test_optimizer')
  }
  const run = spawnSync('python', ['-m', 'unittest', ...modules], { cwd: work, encoding: 'utf8', timeout: 600_000 })
  const failures =
    run.status === 0 ? ''
    : run.error !== undefined ? `kontrol bitmedi: ${run.error.message}`
    : (run.stderr.match(/^(?:FAIL|ERROR): .*$/gm) ?? [run.stderr.trim().split('\n').at(-1) ?? '']).join('; ')

  return { passed: run.status === 0, failures }
}

function checkSmallTask(task, work) {
  cpSync(join(TASKS, task.name, 'hidden'), join(work, 'test'), { recursive: true })
  const check = spawnSync(process.execPath, ['--test'], { cwd: work, encoding: 'utf8', timeout: 180_000 })
  const passed = check.status === 0
  const failures = passed ? '' : check.error !== undefined ? `kontrol bitmedi: ${check.error.message}` : (check.stdout.match(/^not ok .*$/gm) ?? []).join('; ')

  return { passed, failures }
}

function report() {
  const rows = []
  for (const name of Object.keys(ARMS)) {
    const file = resultsOf(name)
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
// --dry calls no model: each repo task must fail its hidden check as given
// and pass it with the real fix's source laid in. Free.
if (process.argv.includes('--dry')) {
  for (const task of tasks.filter(one => one.commit !== undefined)) {
    const work = mkdtempSync(join(tmpdir(), `gearbox-dry-${task.name}-`))
    try {
      prepareRepoTask(task, work)
      const given = checkRepoTask(task, work)
      for (const file of git(['show', '--name-only', '--format=', task.commit, '--', '.', ':!tests'], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean)) {
        writeFileSync(join(work, file), git(['show', `${task.commit}:${file}`]).stdout)
      }
      const fixed = checkRepoTask(task, work)
      const isSound = !given.passed && fixed.passed
      console.log(`${isSound ? 'UYGUN' : 'SORUNLU'}  ${task.name.padEnd(26)} verildiği gibi: ${given.passed ? 'geçti' : 'kaldı'} · düzeltmeyle: ${fixed.passed ? 'geçti' : `kaldı (${fixed.failures.slice(0, 120)})`}`)
    } finally {
      rmSync(work, { recursive: true, force: true })
    }
  }
  process.exit(0)
}
if (set !== 'small' && !existsSync(join(REPOS, set))) {
  console.error(`${join(REPOS, set)} yok: önce projeyi oraya klonla.`)
  process.exit(1)
}
if (arm === 'gearbox-0.8.1' && !existsSync(OLD_GEARBOX.folder)) {
  mkdirSync(OLD_GEARBOX.folder, { recursive: true })
  const archive = spawnSync('git', ['-C', ROOT, 'archive', '--format=tar', OLD_GEARBOX.commit], { maxBuffer: 256 * 1024 * 1024 })
  spawnSync('tar', ['-x', '-C', OLD_GEARBOX.folder], { input: archive.stdout })
}
const { binary, version } = requireVersion()
console.log(`${arm} · ${set} · ${tasks.length} görev × ${runs} çalıştırma · ${version} (${binary})`)

const results = []
for (let run = 1; run <= runs; run += 1) {
  for (const task of tasks) {
    const work = mkdtempSync(join(tmpdir(), `gearbox-${task.name}-`))
    if (task.commit === undefined) {
      cpSync(join(TASKS, '_fixture'), work, { recursive: true })
      const overlay = join(TASKS, task.name, 'overlay')
      if (existsSync(overlay)) {
        cpSync(overlay, work, { recursive: true })
      }
    } else {
      prepareRepoTask(task, work)
    }
    const extra = ['--permission-mode', 'acceptEdits', '--allowedTools', ...TOOLS, ...(setup.settings === undefined ? [] : ['--settings', JSON.stringify(setup.settings)])]
    const answer = runClaude(task.prompt, { cwd: work, plugin: setup.plugin, model: setup.model, effort: setup.effort, extra })
    // Each check has a time limit, so a test that hangs ends the check, not the machine's patience.
    const { passed, failures } = task.commit === undefined ? checkSmallTask(task, work) : checkRepoTask(task, work)
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
// A run of some tasks replaces their rows and keeps the rest of the arm's.
const file = resultsOf(arm)
const kept = only.length > 0 && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).filter(result => !only.includes(result.name)) : []
writeFileSync(file, JSON.stringify([...kept, ...results], null, 2))
const passed = results.filter(result => result.passed).length
const spent = results.reduce((sum, result) => sum + result.cost, 0)
console.log(`\n${arm}: ${passed}/${results.length} geçti, API liste fiyatıyla toplam $${spent.toFixed(3)}`)
