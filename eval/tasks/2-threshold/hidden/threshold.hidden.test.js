import assert from 'node:assert/strict'
import { test } from 'node:test'

import { shippingCost } from '../src/shipping.js'

test('free shipping starts at 750 TL', () => {
  assert.equal(shippingCost(500), 49.9)
  assert.equal(shippingCost(749.99), 49.9)
  assert.equal(shippingCost(750), 0)
})
