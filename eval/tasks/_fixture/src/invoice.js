import { calc } from './cart.js'

export function invoiceLines(items) {
  return items.map(item => item.name + ': ' + calc([item]).toFixed(2) + ' TL')
}
