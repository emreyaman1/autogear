import assert from 'node:assert/strict'
import { test } from 'node:test'

import { checkout } from '../src/cart.js'

const items = [{ name: 'a', price: 100, qty: 1 }]

test('YUZDE10 takes 10% off the subtotal, not the shipping', () => {
  assert.equal(checkout(items, { coupon: 'YUZDE10' }).total, 139.9)
})

test('KARGOBEDAVA makes shipping free', () => {
  const result = checkout(items, { coupon: 'KARGOBEDAVA' })
  assert.equal(result.shipping, 0)
  assert.equal(result.total, 100)
})

test('an unknown coupon throws, no coupon changes nothing', () => {
  assert.throws(() => checkout(items, { coupon: 'YOK' }))
  assert.equal(checkout(items).total, 149.9)
})
