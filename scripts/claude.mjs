// Runs Claude Code headless (`claude -p`) and reads what happened from its
// stream-json output: which models answered, the turns, the cost.

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const ROOT = resolve(import.meta.dirname, '..')

// The oldest Claude Code whose plugin API loads autogear's hooks module; an
// older one refuses it whole, and a measurement would run without autogear.
export const MIN_VERSION = '2.1.295'

const parts = version => (version.match(/\d+/g) ?? []).slice(0, 3).map(Number)

function isOlder(version, than) {
  const [a, b] = [parts(version), parts(than)]
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) {
      return (a[index] ?? 0) < (b[index] ?? 0)
    }
  }

  return false
}

// The folders the Windows desktop app keeps its own Claude Code in, as
// claude-code\<version>\<build>\claude.exe: %APPDATA%\Claude, and in newer
// apps %LOCALAPPDATA%\Claude-Data\<profile>.
function desktopRoots() {
  const roots = [join(process.env.APPDATA ?? '', 'Claude', 'claude-code')]
  const data = join(process.env.LOCALAPPDATA ?? '', 'Claude-Data')
  if (existsSync(data)) {
    roots.push(...readdirSync(data).map(profile => join(data, profile, 'claude-code')))
  }

  return roots.filter(root => existsSync(root))
}

// The newest Claude Code the desktop app keeps, which may be newer than a `claude` installed apart.
function desktopBinary() {
  if (process.platform !== 'win32') {
    return undefined
  }
  const found = desktopRoots().flatMap(root =>
    readdirSync(root)
      .filter(version => /^\d+\.\d+\.\d+$/.test(version))
      .flatMap(version => readdirSync(join(root, version)).map(build => ({ version, binary: join(root, version, build, 'claude.exe') }))),
  )
  found.sort((a, b) => (isOlder(a.version, b.version) ? 1 : isOlder(b.version, a.version) ? -1 : 0))

  return found.find(one => existsSync(one.binary))?.binary
}

export function claudeBinary() {
  if (process.env.CLAUDE_BIN) {
    return process.env.CLAUDE_BIN
  }
  const desktop = desktopBinary()
  if (desktop !== undefined) {
    return desktop
  }
  // On Windows the npm package installs a native binary behind a shell shim.
  const npmBinary = join(process.env.APPDATA ?? '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe')

  return process.platform === 'win32' && existsSync(npmBinary) ? npmBinary : 'claude'
}

// Stops a measurement before it spends anything on a build that would not load autogear.
export function requireVersion() {
  const binary = claudeBinary()
  const version = spawnSync(binary, ['--version'], { encoding: 'utf8' }).stdout?.trim() ?? ''
  if (version === '' || isOlder(version, MIN_VERSION)) {
    throw new Error(`${binary} is Claude Code ${version || '(unknown)'}; autogear needs ${MIN_VERSION} or newer. Set CLAUDE_BIN to a newer claude.`)
  }

  return { binary, version }
}

export function familyOf(model = '') {
  return ['haiku', 'sonnet', 'opus', 'fable'].find(family => model.toLowerCase().includes(family)) ?? model
}

// `plugin: null` runs Claude Code without autogear. User settings stay out
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
