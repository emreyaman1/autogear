import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

import { calculateTotal } from '../src/cart.js'
import { invoiceLines } from '../src/invoice.js'

test('calc is renamed to calculateTotal everywhere', () => {
  assert.equal(calculateTotal([{ name: 'a', price: 10, qty: 2 }]), 20)
  assert.deepEqual(invoiceLines([{ name: 'x', price: 1, qty: 3 }]), ['x: 3.00 TL'])
  for (const file of readdirSync(new URL('../src/', import.meta.url))) {
    assert.doesNotMatch(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), /\bcalc\b/)
  }
})
