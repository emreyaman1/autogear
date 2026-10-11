// Runs Claude Code headless (`claude -p`) and reads what happened from its
// stream-json output: which models answered, the turns, the cost.

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const ROOT = resolve(import.meta.dirname, '..')

export function claudeBinary() {
  if (process.env.CLAUDE_BIN) {
    return process.env.CLAUDE_BIN
  }
  // On Windows the npm package installs a native binary behind a shell shim.
  const npmBinary = join(process.env.APPDATA ?? '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe')

  return process.platform === 'win32' && existsSync(npmBinary) ? npmBinary : 'claude'
}

export function familyOf(model = '') {
  return ['haiku', 'sonnet', 'opus', 'fable'].find(family => model.toLowerCase().includes(family)) ?? model
}

// `plugin: null` runs Claude Code without gearbox. User settings stay out
// (`--setting-sources project`) so the person's own hooks and plugins do not
// run inside a test.
export function runClaude(prompt, { cwd, plugin = ROOT, model = 'opus', effort = 'high', extra = [], timeoutMs = 900_000 } = {}) {
  const args = ['-p', prompt, '--model', model, '--effort', effort, '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project', ...extra]
  if (plugin !== null) {
    args.push('--plugin-dir', plugin)
  }
  const run = spawnSync(claudeBinary(), args, { cwd, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 256 * 1024 * 1024 })
  const events = (run.stdout ?? '').split('\n').flatMap(line => {
    try {
      return line.trim() === '' ? [] : [JSON.parse(line)]
    } catch {
      return []
    }
  })
  const models = [...new Set(events.filter(event => event.type === 'assistant').map(event => event.message?.model).filter(Boolean))]
  const result = events.find(event => event.type === 'result')

  return {
    models,
    cost: result?.total_cost_usd ?? 0,
    turns: result?.num_turns ?? 0,
    durationMs: result?.duration_ms ?? 0,
    text: result?.result ?? '',
    isError: result === undefined || result.is_error === true,
    stderr: run.stderr ?? '',
    error: run.error?.message,
  }
}
