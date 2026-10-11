import assert from 'node:assert/strict'
import { test } from 'node:test'

import { checkout } from '../src/cart.js'

test('the discount applies to products only, never to shipping', () => {
  assert.equal(checkout([{ name: 'a', price: 100, qty: 1 }], { discountRate: 0.1 }).total, 139.9)
  assert.equal(checkout([{ name: 'a', price: 600, qty: 1 }], { discountRate: 0.1 }).total, 540)
})
