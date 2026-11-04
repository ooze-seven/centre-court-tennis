import assert from 'node:assert/strict'
import test from 'node:test'
import { accessFor, type PublicUser } from './accounts.js'

const user: PublicUser = {
  id: '1',
  firstName: 'Test',
  lastName: 'Player',
  username: 'tester',
  phone: '09170000000',
  email: 'tester@example.com',
  role: 'client',
}

test('a closed book is not a signed-out player', () => {
  const result = accessFor({ kind: 'closed' })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.status, 503)
    assert.equal(result.error, 'The book is not open yet.')
  }
})

test('a missing session still asks for a sign-in', () => {
  const result = accessFor({ kind: 'none' })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.status, 401)
    assert.equal(result.error, 'Sign in first.')
  }
})

test('a session opens the gate', () => {
  const result = accessFor({ kind: 'user', user })
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.user.username, 'tester')
})
