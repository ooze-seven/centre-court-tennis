import assert from 'node:assert/strict'
import test from 'node:test'
import { allowHit, clientAddress, decideLimit, memoryHitCount, memoryStore, type HitStore } from './limit.js'

test('the limiter uses the address the proxy added, not the one the caller wrote first', () => {
  assert.equal(clientAddress('1.2.3.4, 203.0.113.8'), '203.0.113.8')
  assert.equal(clientAddress(undefined), 'local')
  assert.equal(clientAddress('  , 203.0.113.5 '), '203.0.113.5')
})

test('hits survive a new check when the store keeps them', async () => {
  const saved = new Map<string, number[]>()
  const store: HitStore = {
    async read(bucket, ip, since) {
      return (saved.get(`${bucket}:${ip}`) ?? []).filter((stamp) => stamp >= since)
    },
    async add(bucket, ip, at) {
      const key = `${bucket}:${ip}`
      saved.set(key, [...(saved.get(key) ?? []), at])
    },
  }
  const now = 1_000_000
  assert.equal(await allowHit(store, '203.0.113.8', 'signin', 2, now), false)
  assert.equal(await allowHit(store, '203.0.113.8', 'signin', 2, now + 1), false)
  assert.equal(await allowHit(store, '203.0.113.8', 'signin', 2, now + 2), true)
})

test('a hit older than ten minutes does not count', () => {
  const now = 1_000_000
  const decision = decideLimit([now - 10 * 60 * 1000], now, 1)
  assert.equal(decision.limited, false)
  assert.deepEqual(decision.stamps, [now])
})

test('the memory store drops hits older than ten minutes', async () => {
  const bucket = 'prune'
  const ip = '203.0.113.77'
  const start = 5_000_000
  await memoryStore.add(bucket, ip, start)
  await memoryStore.add(bucket, ip, start + 1)
  await memoryStore.add(bucket, ip, start + 10 * 60 * 1000)
  assert.equal(memoryHitCount(bucket, ip), 2)
})
