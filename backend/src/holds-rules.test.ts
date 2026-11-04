import assert from 'node:assert/strict'
import test from 'node:test'
import { dayOnBoard, hourHasPassed, judgePass } from './holds.js'

const manilaMorning = Date.parse('2026-11-04T20:00:00.000Z')

test('06:10 on the court is during the hour', () => {
  assert.equal(judgePass('2026-11-05', 6, Date.parse('2026-11-04T22:10:00.000Z')), 'now')
})

test('05:49 on the court is before the hour', () => {
  assert.equal(judgePass('2026-11-05', 6, Date.parse('2026-11-04T21:49:00.000Z')), 'early')
})

test('07:00 on the court is after the hour', () => {
  assert.equal(judgePass('2026-11-05', 6, Date.parse('2026-11-04T23:00:00.000Z')), 'late')
})

test('the request closes when the court hour starts', () => {
  assert.equal(hourHasPassed('2026-11-05', 6, Date.parse('2026-11-04T21:59:00.000Z')), false)
  assert.equal(hourHasPassed('2026-11-05', 6, Date.parse('2026-11-04T22:00:00.000Z')), true)
})

test('the board day follows the court, including the sixty-day window', () => {
  assert.equal(dayOnBoard('2026-11-05', new Date(manilaMorning)), true)
  assert.equal(dayOnBoard('2026-11-04', new Date(manilaMorning)), false)
  assert.equal(dayOnBoard('2027-01-04', new Date(manilaMorning)), true)
  assert.equal(dayOnBoard('2027-01-05', new Date(manilaMorning)), false)
  assert.equal(dayOnBoard('2026-02-31', new Date(manilaMorning)), false)
})
