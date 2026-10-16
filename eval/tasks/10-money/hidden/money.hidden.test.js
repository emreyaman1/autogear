import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { calc, checkout } from '../src/cart.js'
import { roundTL } from '../src/money.js'

test('roundTL rounds to the kuruş as cart.js did', () => {
  for (const value of [59.970000000000006, 12.345, 0.1 + 0.2, 149.9, 2.675, 1000]) {
    assert.equal(roundTL(value), Math.round(value * 100) / 100)
  }
})

test('cart.js rounds through roundTL alone, and behaves as before', () => {
  const source = readFileSync(new URL('../src/cart.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /Math\.round/)
  assert.match(source, /roundTL/)
  assert.equal(calc([{ name: 'kalem', price: 19.99, qty: 3 }]), 59.97)
  assert.deepEqual(checkout([{ name: 'a', price: 100, qty: 1 }], { discountRate: 0.1 }), { subtotal: 100, shipping: 49.9, total: 139.9 })
  assert.deepEqual(checkout([{ name: 'a', price: 600, qty: 1 }]), { subtotal: 600, shipping: 0, total: 600 })
})
