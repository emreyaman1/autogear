// The band's state mark, for the surfaces that draw an image: just the dot, as
// a small vector drawing; the state's name is plain colored Text beside it, so
// it sits on the same line, in the same type, as the words around it.
// The dot moves a little to say what autogear is doing: a soft pulse while it
// routes, a slow breath while it only watches (shadow), still when off, a slow
// blink when it stood down. Pressing is left to the buttons beside it.

import type { AutogearMode } from '../../types'
import { L } from './text'

export const DOT_SIZE = 12

// A row that holds buttons is laid out one text line tall, while a desktop paints
// its buttons taller: the row below then runs into them. A drawing of this
// height at the row's start gives the row the room (the dot's, and the hand-over
// note's icon's); the shapes sit in its middle.
export const ROW_HEIGHT = 28

// On green, shadow violet (it watches and writes, the picker answers), off
// slate, stood down amber (its choices stopped taking effect).
export const BADGE_COLORS: Record<AutogearMode, string> = { auto: '#16a34a', shadow: '#7c3aed', pin: '#64748b', down: '#d97706' }

// A state's name, in the language in use when it is drawn.
export const badgeName = (mode: AutogearMode): string =>
  mode === 'auto' ? L('ON', 'AÇIK') : mode === 'shadow' ? L('SHADOW', 'GÖLGE') : mode === 'pin' ? L('OFF', 'KAPALI') : L('STOPPED', 'DURDU')

// Each state's motion, as CSS: it runs where the Svg is drawn interactive and
// stops for a person who asked their system for less motion.
const MOTION: Record<AutogearMode, string> = {
  auto: '.halo{animation:pulse 2.4s ease-out infinite;transform-origin:6px 14px}@keyframes pulse{0%{opacity:.55;transform:scale(1)}70%,100%{opacity:0;transform:scale(2)}}',
  shadow: '.dot{animation:breathe 3.2s ease-in-out infinite}@keyframes breathe{0%,100%{opacity:1}50%{opacity:.35}}',
  pin: '',
  down: '.dot{animation:blink 1.6s steps(2,start) infinite}@keyframes blink{to{opacity:.25}}',
}

export function dotSvg(mode: AutogearMode): string {
  const color = BADGE_COLORS[mode]
  const style = `${MOTION[mode]}@media (prefers-reduced-motion:reduce){*{animation:none!important}}`
  // Off, the dot is a hollow ring: nothing is running.
  const dot =
    mode === 'pin'
      ? `<circle class="dot" cx="6" cy="14" r="3" fill="none" stroke="${color}" stroke-width="1.5"/>`
      : `${mode === 'auto' ? `<circle class="halo" cx="6" cy="14" r="3" fill="${color}"/>` : ''}<circle class="dot" cx="6" cy="14" r="3" fill="${color}"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${DOT_SIZE}" height="${ROW_HEIGHT}" viewBox="0 0 ${DOT_SIZE} ${ROW_HEIGHT}"><style>${style}</style>${dot}</svg>`
}

// The hand-over note's mark: a small page, in a neutral gray, as tall as the dot's.
export const noteSvg = (): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${DOT_SIZE}" height="${ROW_HEIGHT}" viewBox="0 0 ${DOT_SIZE} ${ROW_HEIGHT}"><rect x="1.5" y="8" width="9" height="12" rx="1.5" fill="none" stroke="#9a978f" stroke-width="1.2"/><path d="M3.8 12h4.4M3.8 14.5h4.4M3.8 17h2.6" stroke="#9a978f" stroke-width="1" stroke-linecap="round"/></svg>`
