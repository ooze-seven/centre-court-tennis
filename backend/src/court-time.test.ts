import assert from 'node:assert/strict'
import test from 'node:test'
import { courtInstant } from './court-time.js'

test('06:00 on the court is 22:00 UTC the previous day', () => {
  assert.equal(courtInstant('2026-11-05', 6), Date.parse('2026-11-04T22:00:00.000Z'))
})

test('the court hour is not read as UTC', () => {
  assert.notEqual(courtInstant('2026-11-05', 6), Date.parse('2026-11-05T06:00:00.000Z'))
})
