import assert from 'node:assert/strict'
import test from 'node:test'
import { courtInstant } from './court-time.ts'
import { addDaysISO } from './days.ts'
import { isPast, takenBoard } from './schedule.ts'

test('06:00 on the court is 22:00 UTC the previous day', () => {
  assert.equal(courtInstant('2026-11-05', 6), Date.parse('2026-11-04T22:00:00.000Z'))
})

test('an hour stays open until the court clock reaches it', () => {
  assert.equal(isPast('2026-11-05', 6, new Date('2026-11-04T21:59:00.000Z')), false)
  assert.equal(isPast('2026-11-05', 6, new Date('2026-11-04T22:00:00.000Z')), true)
})

test('the desk week starts on the court day', () => {
  const now = new Date('2026-11-04T20:00:00.000Z')
  assert.equal(addDaysISO(0, now), '2026-11-05')
  assert.equal(addDaysISO(1, now), '2026-11-06')
})

test('a failed board load does not mark every hour open', () => {
  const next = takenBoard({ held: {}, known: false }, { ok: false, error: 'The board did not open.' })
  assert.equal(next.known, false)
  assert.equal(next.error, 'The board did not open.')
  assert.deepEqual(next.held, {})
})

test('a loaded board keeps the hours the book already holds', () => {
  const next = takenBoard({ held: {}, known: false }, { ok: true, slots: [{ date: '2026-11-05', hour: 6 }] })
  assert.equal(next.known, true)
  assert.equal(next.error, '')
  assert.equal(next.held['2026-11-05-6'], true)
})
