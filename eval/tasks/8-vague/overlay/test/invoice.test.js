import assert from 'node:assert/strict'
import { test } from 'node:test'

import { invoiceLines } from '../src/invoice.js'

test('invoice lines keep the kuruş', () => {
  assert.deepEqual(invoiceLines([{ name: 'defter', price: 12.45, qty: 1 }]), ['defter: 12.45 TL'])
})
