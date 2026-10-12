// The on/off switch above the prompt, for the surfaces that draw an image: a
// rounded track with a round white knob, as one vector drawing.

export const SWITCH_ON = '#22c55e'
export const SWITCH_OFF = '#6b7280'

export const SWITCH_WIDTH = 42
export const SWITCH_HEIGHT = 22

const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

// On: a green track, the knob at the right, "ON" opposite it. Off: a gray
// track, the knob at the left, "OFF" opposite it.
export function switchSvg(isOn: boolean): string {
  const radius = SWITCH_HEIGHT / 2
  const room = (SWITCH_WIDTH - SWITCH_HEIGHT) / 2
  const knobX = isOn ? SWITCH_WIDTH - radius : radius
  const wordX = isOn ? room + 2 : SWITCH_WIDTH - room - 2

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SWITCH_WIDTH}" height="${SWITCH_HEIGHT}" viewBox="0 0 ${SWITCH_WIDTH} ${SWITCH_HEIGHT}">`,
    '<defs><filter id="knob" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity=".3"/></filter></defs>',
    `<rect width="${SWITCH_WIDTH}" height="${SWITCH_HEIGHT}" rx="${radius}" fill="${isOn ? SWITCH_ON : SWITCH_OFF}"/>`,
    `<text x="${wordX}" y="${radius + 3.4}" text-anchor="middle" font-family="${FONT}" font-size="${isOn ? 9.5 : 8.5}" font-weight="700" letter-spacing=".3" fill="#fff" fill-opacity=".92">${isOn ? 'ON' : 'OFF'}</text>`,
    `<circle cx="${knobX}" cy="${radius}" r="${radius - 2}" fill="#fff" filter="url(#knob)"/>`,
    '</svg>',
  ].join('')
}
