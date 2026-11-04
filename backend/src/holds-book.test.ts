import assert from 'node:assert/strict'
import test from 'node:test'
import { holdBlock } from './holds.js'

const rows = [{ userId: 'a', date: '2026-11-05', hour: 6 }]

test('the same player cannot request the hour twice', () => {
  assert.equal(holdBlock(rows, 'a', '2026-11-05', 6), 'That hour is already in your request.')
})

test('another player cannot take a held hour', () => {
  assert.equal(holdBlock(rows, 'b', '2026-11-05', 6), 'That hour is already held.')
})

test('an open hour is free', () => {
  assert.equal(holdBlock(rows, 'b', '2026-11-05', 7), null)
})
