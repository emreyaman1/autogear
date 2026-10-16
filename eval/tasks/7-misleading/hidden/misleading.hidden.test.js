import assert from 'node:assert/strict'
import { test } from 'node:test'

import { calc, checkout } from '../src/cart.js'
import { invoiceLines } from '../src/invoice.js'

// The failing test points at invoice.js; the kuruş are lost in calc, which
// checkout uses too. A fix in invoice.js alone leaves checkout wrong.
test('calc keeps the kuruş, and so do the invoice and the checkout', () => {
  assert.equal(calc([{ name: 'defter', price: 12.45, qty: 1 }]), 12.45)
  assert.equal(calc([{ name: 'kalem', price: 19.99, qty: 3 }]), 59.97)
  assert.deepEqual(invoiceLines([{ name: 'defter', price: 12.45, qty: 1 }]), ['defter: 12.45 TL'])
  assert.deepEqual(checkout([{ name: 'defter', price: 12.45, qty: 2 }]), { subtotal: 24.9, shipping: 49.9, total: 74.8 })
})
