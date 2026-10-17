// The band's state badge, for the surfaces that draw an image: a rounded pill
// in the state's color with a dot and the state's name, as one vector drawing.
// The dot moves a little to say what gearbox is doing: a soft pulse while it
// routes, a slow breath while it only watches (shadow), still when off, a slow
// blink when it stood down. Pressing is left to the buttons beside it.

import type { GearboxMode } from '../../types'
import { L } from './text'

export const BADGE_HEIGHT = 22

// On green, shadow violet (it watches and writes, the picker answers), off
// slate, stood down amber (its choices stopped taking effect).
export const BADGE_COLORS: Record<GearboxMode, string> = { auto: '#16a34a', shadow: '#7c3aed', pin: '#64748b', down: '#d97706' }

// Getters, so a name is read in the language in use when it is drawn.
export const BADGE_NAMES: Record<GearboxMode, string> = {
  get auto() {
    return L('ON', 'AÇIK')
  },
  get shadow() {
    return L('SHADOW', 'GÖLGE')
  },
  get pin() {
    return L('OFF', 'KAPALI')
  },
  get down() {
    return L('STOPPED', 'DURDU')
  },
}

const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

// The width of a 10px semibold capital, near enough to size the pill.
const CAPITAL = 6.6
const DOT_ROOM = 20
const END_ROOM = 10

export function badgeWidth(mode: GearboxMode): number {
  return Math.round(DOT_ROOM + BADGE_NAMES[mode].length * CAPITAL + END_ROOM)
}

// Each state's motion, as CSS: it runs where the Svg is drawn interactive and
// stops for a person who asked their system for less motion.
const MOTION: Record<GearboxMode, string> = {
  auto: '.halo{animation:pulse 2.4s ease-out infinite;transform-origin:11px 11px}@keyframes pulse{0%{opacity:.55;transform:scale(1)}70%,100%{opacity:0;transform:scale(2.3)}}',
  shadow: '.dot{animation:breathe 3.2s ease-in-out infinite}@keyframes breathe{0%,100%{opacity:1}50%{opacity:.35}}',
  pin: '',
  down: '.dot{animation:blink 1.6s steps(2,start) infinite}@keyframes blink{to{opacity:.25}}',
}

export function badgeSvg(mode: GearboxMode): string {
  const width = badgeWidth(mode)
  const radius = BADGE_HEIGHT / 2
  const color = BADGE_COLORS[mode]
  const style = `${MOTION[mode]}@media (prefers-reduced-motion:reduce){*{animation:none!important}}`
  // Off, the dot is a hollow ring: nothing is running.
  const dot =
    mode === 'pin'
      ? `<circle class="dot" cx="11" cy="${radius}" r="3" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.5"/>`
      : `${mode === 'auto' ? `<circle class="halo" cx="11" cy="${radius}" r="3.5" fill="#fff"/>` : ''}<circle class="dot" cx="11" cy="${radius}" r="3.5" fill="#fff"/>`

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${BADGE_HEIGHT}" viewBox="0 0 ${width} ${BADGE_HEIGHT}">`,
    `<style>${style}</style>`,
    '<defs><linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>',
    `<rect width="${width}" height="${BADGE_HEIGHT}" rx="${radius}" fill="${color}"/>`,
    `<rect width="${width}" height="${BADGE_HEIGHT}" rx="${radius}" fill="url(#sheen)"/>`,
    dot,
    `<text x="${DOT_ROOM}" y="${radius + 3.5}" font-family="${FONT}" font-size="10" font-weight="600" letter-spacing=".5" fill="#fff">${BADGE_NAMES[mode]}</text>`,
    '</svg>',
  ].join('')
}
