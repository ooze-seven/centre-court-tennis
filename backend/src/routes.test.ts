import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')

test('the old court catalogue and enquiry route are gone', () => {
  assert.equal(/app\.get\('\/api\/court',/.test(source), false)
  assert.equal(source.includes("app.post('/api/enquiries'"), false)
  assert.equal(source.includes("app.get('/api/court/taken'"), true)
})
