import assert from 'node:assert/strict'
import test from 'node:test'
import { hashPassword, verifyPassword } from './passwords.js'

test('a password matches its hash and a different one does not', async () => {
  const stored = await hashPassword('court-test-pass')
  assert.equal(await verifyPassword('court-test-pass', stored), true)
  assert.equal(await verifyPassword('court-test-nope', stored), false)
  assert.equal(await verifyPassword('court-test-pass', 'nope'), false)
})
