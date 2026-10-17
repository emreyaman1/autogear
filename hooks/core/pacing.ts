// Reads the subscription's rate-limit windows: is the session spending faster
// than the windows allow, or leaving room unused just before a reset? A window
// under pressure is only reported: the choice stays what the work needs.

import { L, pct } from './text'

export type RateWindow = { kind: string; percentUsed: number; resetsAt?: string }

export type PaceLevel = 'surplus' | 'normal' | 'tight' | 'critical'

export type Pace = { level: PaceLevel; reason?: string }

const HOUR = 3_600_000

const WINDOW_MS: Record<string, number> = { five_hour: 5 * HOUR, seven_day: 7 * 24 * HOUR }

const windowName = (kind: string): string =>
  kind === 'five_hour' ? L('5-hour', '5 saatlik') : kind === 'seven_day' ? L('weekly', 'haftalık') : kind

const SEVERITY: readonly PaceLevel[] = ['surplus', 'normal', 'tight', 'critical']

// Compares each window's use with a steady pace: the share that would be gone
// by now had it been spent evenly up to the reset.
export function pace(windows: readonly RateWindow[], nowMs: number): Pace {
  let worst: Pace = { level: 'normal' }
  let surplus: Pace | undefined
  for (const window of windows) {
    const length = WINDOW_MS[window.kind]
    const resetsAt = window.resetsAt === undefined ? Number.NaN : Date.parse(window.resetsAt)
    if (length === undefined || Number.isNaN(resetsAt)) {
      continue
    }
    const elapsed = Math.min(1, Math.max(0, 1 - (resetsAt - nowMs) / length))
    const used = window.percentUsed
    const expected = elapsed * 100
    const level: PaceLevel =
      used >= 90 ? 'critical'
      : used >= 30 && used - expected >= 20 ? 'tight'
      : elapsed >= 0.85 && used <= 50 ? 'surplus'
      : 'normal'
    // Nearly full, the share is all that matters; otherwise the pace beside it.
    const name = `${windowName(window.kind)} limit ${pct(Math.round(used))}`
    const reason = level === 'critical' ? name : `${name} ${L('(expected', '(beklenen')} ${pct(Math.round(expected))})`
    if (level === 'surplus') {
      surplus ??= { level, reason }
    } else if (SEVERITY.indexOf(level) > SEVERITY.indexOf(worst.level)) {
      worst = { level, reason }
    }
  }

  // Room left in one window counts only while no window is under pressure.
  return worst.level === 'normal' && surplus !== undefined ? surplus : worst
}

// The warning shown under the answer and in the band while a window is under
// pressure, naming what the work runs on: "5 saatlik limit %92: bu iş Opus ·
// high ile yapılıyor, limit dolabilir".
export function paceWarning(current: Pace | undefined, running: string): string | undefined {
  if (current === undefined || (current.level !== 'critical' && current.level !== 'tight')) {
    return undefined
  }
  const reason = current.reason ?? 'limit'

  return current.level === 'critical'
    ? `${reason}: ${L(`this work runs on ${running}, the limit may run out`, `bu iş ${running} ile yapılıyor, limit dolabilir`)}`
    : `${reason}: ${L(`spending fast; this work runs on ${running}, the limit may run out early`, `hızlı harcanıyor; bu iş ${running} ile yapılıyor, limit erken dolabilir`)}`
}
