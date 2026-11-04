import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../components/Schedule.tsx', import.meta.url), 'utf8')

test('the board clock is not frozen at the first render', () => {
  assert.equal(source.includes('useRef(new Date()).current'), false)
  assert.equal(source.includes('clockDelay'), true)
})

test('a failed taken-hours load is not ignored', () => {
  const load = source.slice(source.indexOf('requestTaken()'), source.indexOf('requestMyHolds()'))
  assert.equal(load.includes('.catch(() => undefined)'), false)
  assert.equal(source.includes('takenBoard'), true)
})
