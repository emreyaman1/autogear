// The band's state badge, for the surfaces that draw an image: a rounded pill
// in the state's color with its name, as one vector drawing. Pressing is left
// to the buttons beside it, each named for what it does.

import type { GearboxMode } from '../../types'

export const BADGE_WIDTH = 60
export const BADGE_HEIGHT = 22

// On green, shadow violet (it watches and writes, the picker answers), off
// gray, stood down amber (its choices stopped taking effect).
export const BADGE_COLORS: Record<GearboxMode, string> = { auto: '#22c55e', shadow: '#8b5cf6', pin: '#6b7280', down: '#f59e0b' }

export const BADGE_NAMES: Record<GearboxMode, string> = { auto: 'AÇIK', shadow: 'GÖLGE', pin: 'KAPALI', down: 'DURDU' }

const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

export function badgeSvg(mode: GearboxMode): string {
  const radius = BADGE_HEIGHT / 2

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" viewBox="0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}">`,
    `<rect width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" rx="${radius}" fill="${BADGE_COLORS[mode]}"/>`,
    `<text x="${BADGE_WIDTH / 2}" y="${radius + 3.4}" text-anchor="middle" font-family="${FONT}" font-size="9.5" font-weight="700" letter-spacing=".4" fill="#fff">${BADGE_NAMES[mode]}</text>`,
    '</svg>',
  ].join('')
}
