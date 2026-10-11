import { shippingCost } from './shipping.js'

// items: [{ name, price (TL), qty }]
export function calc(items) {
  let total = 0
  for (const item of items) {
    total += item.price * item.qty
  }
  return Math.round(total * 100) / 100
}

export function checkout(items, { discountRate = 0 } = {}) {
  const subtotal = calc(items)
  const shipping = shippingCost(subtotal)
  const total = Math.round((subtotal + shipping) * (1 - discountRate) * 100) / 100
  return { subtotal, shipping, total }
}
