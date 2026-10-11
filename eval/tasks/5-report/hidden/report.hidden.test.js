import assert from 'node:assert/strict'
import { test } from 'node:test'

import { monthlyTotals } from '../src/report.js'

test('monthly totals with VAT are right to the kuruş', () => {
  const orders = [
    { date: '2026-09-03', amount: 1.5 },
    { date: '2026-09-15', amount: 1.65 },
    { date: '2026-10-01', amount: 1.9 },
  ]
  assert.deepEqual(monthlyTotals(orders), {'2026-09':3.78,'2026-10':2.28})
})
