// Which Claude Code builds gearbox has been checked on.

// The newest build whose plugin API gearbox's tests and live smoke test
// passed on. A newer build gets a one-time notice; gearbox keeps running and
// switches itself off if its choices stop taking effect.
export const TESTED_THROUGH = '2.1.295'

function parts(version: string): number[] {
  return (version.match(/\d+/g) ?? []).slice(0, 3).map(Number)
}

export function isNewerThan(version: string, than: string): boolean {
  const [a, b] = [parts(version), parts(than)]
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0)
    if (difference !== 0) {
      return difference > 0
    }
  }

  return false
}
