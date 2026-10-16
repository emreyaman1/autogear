import { shippingCost } from './shipping.js'

// items: [{ name, price (TL), qty }]
export function calc(items) {
  let total = 0
  for (const item of items) {
    total += item.price * item.qty
  }
  return Math.floor(total * 10) / 10
}

export function checkout(items, { discountRate = 0 } = {}) {
  const subtotal = calc(items)
  const discounted = Math.round(subtotal * (1 - discountRate) * 100) / 100
  const shipping = shippingCost(subtotal)
  return { subtotal, shipping, total: Math.round((discounted + shipping) * 100) / 100 }
}
