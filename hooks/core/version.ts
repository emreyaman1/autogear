// Which Claude Code builds autogear has been checked on.

// The newest build whose plugin API autogear's tests and live smoke test
// passed on. A newer build gets a one-time notice; autogear keeps running and
// switches itself off if its choices stop taking effect.
export const TESTED_THROUGH = '2.1.299'

// autogear's own version, for a shared report: raised together with the
// version in .claude-plugin/plugin.json (a test cannot read that file).
export const AUTOGEAR_VERSION = '0.12.2'

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
