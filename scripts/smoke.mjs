// Live check that autogear still changes the model on this Claude Code build.
//
// Sends three short prompts through `claude -p` with the plugin loaded and
// reads which model the API reports as having answered. It spends a little
// of your usage: run it after a Claude Code update, not on every change.
//
//   node scripts/smoke.mjs

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { familyOf, runClaude } from './claude.mjs'

const CASES = [
  { prompt: 'bu fonksiyon ne yapıyor? function add(a, b) { return a + b }', expect: 'haiku' },
  { prompt: '+opus merhaba, tek kelimeyle selam ver', expect: 'opus' },
  // Hard work runs on Sonnet in tasarruf (0.9.0); Opus only for critical work, plan mode and when asked.
  { prompt: 'bu mimariyi neden böyle kurduk, alternatifleri karşılaştır. Tek cümleyle cevap ver.', expect: 'sonnet' },
]

const plugin = process.argv[2]
const work = mkdtempSync(join(tmpdir(), 'gearbox-smoke-'))
let failures = 0
let spent = 0
for (const { prompt, expect } of CASES) {
  const run = runClaude(prompt, {
    cwd: work,
    ...(plugin === undefined ? {} : { plugin }),
    extra: ['--tools', '', '--system-prompt', 'Answer in one short sentence.'],
  })
  const isRouted = run.models.length > 0 && run.models.every(model => familyOf(model) === expect)
  failures += isRouted ? 0 : 1
  spent += run.cost
  console.log(`${isRouted ? 'OK  ' : 'FAIL'}  beklenen ${expect.padEnd(6)} gelen ${run.models.join(', ') || '-'}  $${run.cost.toFixed(4)}  ${prompt.slice(0, 48)}`)
  if (!isRouted) {
    console.log(run.error ?? run.stderr.slice(0, 1500))
  }
}
rmSync(work, { recursive: true, force: true })
console.log(`Toplam (API liste fiyatıyla): $${spent.toFixed(4)}`)
process.exit(failures === 0 ? 0 : 1)
