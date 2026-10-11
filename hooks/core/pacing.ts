// Reads the subscription's rate-limit windows: is the session spending faster
// than the windows allow, or leaving room unused just before a reset?

export type RateWindow = { kind: string; percentUsed: number; resetsAt?: string }

export type PaceLevel = 'surplus' | 'normal' | 'tight' | 'critical'

export type Pace = { level: PaceLevel; reason?: string }

const HOUR = 3_600_000

const WINDOW_MS: Record<string, number> = { five_hour: 5 * HOUR, seven_day: 7 * 24 * HOUR }

const WINDOW_NAMES: Record<string, string> = { five_hour: '5 saatlik', seven_day: 'haftalık' }

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
    const reason = `${WINDOW_NAMES[window.kind] ?? window.kind} limit %${Math.round(used)} (beklenen %${Math.round(expected)})`
    const level: PaceLevel =
      used >= 90 ? 'critical'
      : used >= 30 && used - expected >= 20 ? 'tight'
      : elapsed >= 0.85 && used <= 50 ? 'surplus'
      : 'normal'
    if (level === 'surplus') {
      surplus ??= { level, reason }
    } else if (SEVERITY.indexOf(level) > SEVERITY.indexOf(worst.level)) {
      worst = { level, reason }
    }
  }

  // Room left in one window counts only while no window is under pressure.
  return worst.level === 'normal' && surplus !== undefined ? surplus : worst
}
