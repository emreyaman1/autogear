// The band's state badge, for the surfaces that draw an image: a rounded pill
// tinted in the state's color (a faint fill, a thin outline, the dot and the
// name in the color itself) so it sits quietly beside the text around it,
// as one vector drawing.
// The dot moves a little to say what autogear is doing: a soft pulse while it
// routes, a slow breath while it only watches (shadow), still when off, a slow
// blink when it stood down. Pressing is left to the buttons beside it.

import type { AutogearMode } from '../../types'
import { L } from './text'

export const BADGE_HEIGHT = 20

// On green, shadow violet (it watches and writes, the picker answers), off
// slate, stood down amber (its choices stopped taking effect).
export const BADGE_COLORS: Record<AutogearMode, string> = { auto: '#16a34a', shadow: '#7c3aed', pin: '#64748b', down: '#d97706' }

// A state's name, in the language in use when it is drawn.
export const badgeName = (mode: AutogearMode): string =>
  mode === 'auto' ? L('ON', 'AÇIK') : mode === 'shadow' ? L('SHADOW', 'GÖLGE') : mode === 'pin' ? L('OFF', 'KAPALI') : L('STOPPED', 'DURDU')

const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

// The width of an 11px semibold capital, near enough to size the pill.
const CAPITAL = 7.1
const DOT_ROOM = 19
const END_ROOM = 9

export function badgeWidth(mode: AutogearMode): number {
  return Math.round(DOT_ROOM + badgeName(mode).length * CAPITAL + END_ROOM)
}

// Each state's motion, as CSS: it runs where the Svg is drawn interactive and
// stops for a person who asked their system for less motion.
const MOTION: Record<AutogearMode, string> = {
  auto: '.halo{animation:pulse 2.4s ease-out infinite;transform-origin:10px 10px}@keyframes pulse{0%{opacity:.55;transform:scale(1)}70%,100%{opacity:0;transform:scale(2.3)}}',
  shadow: '.dot{animation:breathe 3.2s ease-in-out infinite}@keyframes breathe{0%,100%{opacity:1}50%{opacity:.35}}',
  pin: '',
  down: '.dot{animation:blink 1.6s steps(2,start) infinite}@keyframes blink{to{opacity:.25}}',
}

export function badgeSvg(mode: AutogearMode): string {
  const width = badgeWidth(mode)
  const radius = BADGE_HEIGHT / 2
  const color = BADGE_COLORS[mode]
  const style = `${MOTION[mode]}@media (prefers-reduced-motion:reduce){*{animation:none!important}}`
  // Off, the dot is a hollow ring: nothing is running.
  const dot =
    mode === 'pin'
      ? `<circle class="dot" cx="10" cy="${radius}" r="2.6" fill="none" stroke="${color}" stroke-width="1.4"/>`
      : `${mode === 'auto' ? `<circle class="halo" cx="10" cy="${radius}" r="3" fill="${color}"/>` : ''}<circle class="dot" cx="10" cy="${radius}" r="3" fill="${color}"/>`

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${BADGE_HEIGHT}" viewBox="0 0 ${width} ${BADGE_HEIGHT}">`,
    `<style>${style}</style>`,
    `<rect x=".5" y=".5" width="${width - 1}" height="${BADGE_HEIGHT - 1}" rx="${radius - 0.5}" fill="${color}" fill-opacity=".14" stroke="${color}" stroke-opacity=".5"/>`,
    dot,
    `<text x="${DOT_ROOM}" y="${radius + 4}" font-family="${FONT}" font-size="11" font-weight="600" letter-spacing=".4" fill="${color}">${badgeName(mode)}</text>`,
    '</svg>',
  ].join('')
}
