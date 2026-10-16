import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

// Set on every run this file starts. Its runs never start more: a run that
// could reach this file again would copy and start itself without end.
const INNER = 'GEARBOX_MUTANT_RUN'

// Bugs the tests Claude wrote must catch, each one alone: a test run on the
// changed code has to fail. The project's own shop.test.js is left out, so
// only the new tests count.
const MUTANTS = [
  ['src/shipping.js', 'subtotal >= FREE_SHIPPING_THRESHOLD', 'subtotal > FREE_SHIPPING_THRESHOLD'],
  ['src/shipping.js', 'SHIPPING_FEE = 49.9', 'SHIPPING_FEE = 49'],
  ['src/cart.js', 'total += item.price * item.qty', 'total += item.price'],
  ['src/cart.js', 'return Math.round(total * 100) / 100', 'return total'],
  ['src/cart.js', 'const shipping = shippingCost(subtotal)', 'const shipping = shippingCost(discounted)'],
  ['src/cart.js', 'subtotal * (1 - discountRate)', 'subtotal * (1 + discountRate)'],
]

const isHidden = file => file.includes('.hidden.')

const theirTests = readdirSync(join(ROOT, 'test')).filter(file => file.endsWith('.js') && file !== 'shop.test.js' && !isHidden(file))

if (process.env[INNER] === undefined) {
  test('the source was left as it was', () => {
    for (const [file, before] of MUTANTS) {
      assert.ok(readFileSync(join(ROOT, file), 'utf8').includes(before), `${file} changed`)
    }
  })

  test('new tests were written', () => {
    assert.ok(theirTests.length > 0)
  })

  for (const [file, before, after] of MUTANTS) {
    test(`the new tests catch: ${file}: ${after}`, () => {
      // With no test files named, node --test would run every test it finds, this one too.
      assert.ok(theirTests.length > 0, 'no new tests to run')
      const copy = mkdtempSync(join(tmpdir(), 'mutant-'))
      try {
        cpSync(ROOT, copy, { recursive: true })
        for (const name of readdirSync(join(copy, 'test')).filter(isHidden)) {
          rmSync(join(copy, 'test', name))
        }
        const path = join(copy, file)
        writeFileSync(path, readFileSync(path, 'utf8').replace(before, after))
        // A run started inside node --test reports to it and exits 0 unless told it stands alone.
        const { NODE_TEST_CONTEXT: _, ...env } = process.env
        const run = spawnSync(process.execPath, ['--test', ...theirTests.map(name => join('test', name))], {
          cwd: copy,
          encoding: 'utf8',
          env: { ...env, [INNER]: '1' },
          timeout: 30_000,
        })
        assert.equal(run.error, undefined, 'the run did not finish')
        assert.notEqual(run.status, 0, 'the tests still pass with the bug in')
      } finally {
        rmSync(copy, { recursive: true, force: true })
      }
    })
  }
}
