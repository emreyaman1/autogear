import assert from 'node:assert/strict'
import { test } from 'node:test'

import { calc, checkout } from '../src/cart.js'
import { invoiceLines } from '../src/invoice.js'
import { monthlyTotals } from '../src/report.js'
import { shippingCost } from '../src/shipping.js'

test('calc sums price times quantity', () => {
  assert.equal(calc([{ name: 'a', price: 10, qty: 2 }, { name: 'b', price: 5.5, qty: 1 }]), 25.5)
})

test('shipping is free on big orders', () => {
  assert.equal(shippingCost(1000), 0)
  assert.equal(shippingCost(100), 49.9)
})

test('checkout adds shipping', () => {
  assert.deepEqual(checkout([{ name: 'a', price: 100, qty: 1 }]), { subtotal: 100, shipping: 49.9, total: 149.9 })
})

test('invoice lines show each item', () => {
  assert.deepEqual(invoiceLines([{ name: 'kalem', price: 12.5, qty: 2 }]), ['kalem: 25.00 TL'])
})

test('monthly totals group by month', () => {
  assert.deepEqual(monthlyTotals([{ date: '2026-09-01', amount: 10 }]), { '2026-09': 12 })
})
