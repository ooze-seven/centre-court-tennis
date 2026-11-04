import { bookError, rest } from './db.js'

export const limitWindowMs = 10 * 60 * 1000

export type HitStore = {
  read(bucket: string, ip: string, since: number): Promise<number[]>
  add(bucket: string, ip: string, at: number): Promise<void>
}

export function clientAddress(header: string | undefined) {
  const parts = header?.split(',').map((part) => part.trim()).filter(Boolean) ?? []
  return parts.at(-1)?.slice(0, 64) || 'local'
}

export function decideLimit(stamps: number[], now: number, max: number, windowMs = limitWindowMs) {
  const recent = stamps.filter((stamp) => now - stamp < windowMs)
  if (recent.length >= max) return { limited: true, stamps: recent }
  return { limited: false, stamps: [...recent, now] }
}

export async function allowHit(store: HitStore, ip: string, bucket: string, max: number, now = Date.now()) {
  const prior = await store.read(bucket, ip, now - limitWindowMs)
  const decision = decideLimit(prior, now, max)
  if (!decision.limited) await store.add(bucket, ip, now)
  return decision.limited
}

const memory = new Map<string, number[]>()

const memoryStore: HitStore = {
  async read(bucket, ip, since) {
    return (memory.get(`${bucket}:${ip}`) ?? []).filter((stamp) => stamp >= since)
  },
  async add(bucket, ip, at) {
    const key = `${bucket}:${ip}`
    const stamps = memory.get(key) ?? []
    stamps.push(at)
    memory.set(key, stamps)
  },
}

let table: 'ready' | 'missing' = 'missing'
let looked = false
let prunedAt = 0

const bookStore: HitStore = {
  async read(bucket, ip, since) {
    const rows = await rest<{ at: string }[]>(
      `rate_hits?bucket=eq.${encodeURIComponent(bucket)}&ip=eq.${encodeURIComponent(ip)}&at=gte.${encodeURIComponent(new Date(since).toISOString())}&select=at`,
    )
    return rows.map((row) => Date.parse(row.at)).filter((stamp) => Number.isFinite(stamp))
  },
  async add(bucket, ip, at) {
    await rest('rate_hits', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({ id: crypto.randomUUID(), bucket, ip, at: new Date(at).toISOString() }),
    })
    if (at - prunedAt < 60_000) return
    prunedAt = at
    const cutoff = new Date(at - limitWindowMs).toISOString()
    await rest(`rate_hits?at=lt.${encodeURIComponent(cutoff)}`, {
      method: 'DELETE',
      headers: { prefer: 'return=minimal' },
    }).catch(() => undefined)
  },
}

async function durableStore() {
  if (looked) return table === 'ready' ? bookStore : null
  try {
    await rest('rate_hits?select=id&limit=1')
    looked = true
    table = 'ready'
    return bookStore
  } catch (error) {
    const code = bookError(error)?.code
    if (code === 'PGRST205' || code === '42P01' || code === 'config') {
      looked = true
      table = 'missing'
    }
    return null
  }
}

export async function limited(ip: string, bucket: string, max: number, now = Date.now()) {
  try {
    const store = (await durableStore()) ?? memoryStore
    return await allowHit(store, ip, bucket, max, now)
  } catch {
    return allowHit(memoryStore, ip, bucket, max, now)
  }
}
