import { serve } from '@hono/node-server'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  authenticate,
  closeSession,
  ensureDesk,
  listAccounts,
  openSession,
  register,
  userForSession,
  warmAccounts,
} from './accounts.js'
import { loadEnv } from './env.js'
import { allHolds, createHold, holdsFor } from './holds.js'

const times = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
const formats = ['singles', 'doubles'] as const
const sessionCookie = 'cct_session'
const sessionMaxAge = 14 * 24 * 60 * 60

type Format = (typeof formats)[number]

type Enquiry = {
  id: string
  name: string
  email: string
  date: string
  time: string
  format: Format
  note: string
  userId: string
  createdAt: string
}

const dataFile = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'enquiries.json')
const hits = new Map<string, number[]>()

const app = new Hono()

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }),
)

app.get('/api/health', (c) => c.json({ ok: true }))

app.get('/api/court', (c) => c.json({ formats, times }))

app.post('/api/auth/signup', async (c) => {
  const ip = clientIp(c.req.header('x-forwarded-for'))
  if (limited(ip, 'signup', 20)) return c.json({ ok: false, error: 'Too many tries. Wait a few minutes.' }, 429)
  const payload = await readJson(c)
  if (!payload) return c.json({ ok: false, error: 'Send that again.' }, 400)
  const result = await register(payload, 'client')
  if (!result.ok) return c.json(result, 400)
  const id = await openSession(result.user.id)
  writeSession(c, id)
  console.log(`Player joined · ${result.user.username}`)
  return c.json({ ok: true, user: result.user }, 201)
})

app.post('/api/auth/signin', async (c) => {
  const ip = clientIp(c.req.header('x-forwarded-for'))
  if (limited(ip, 'signin', 40)) return c.json({ ok: false, error: 'Too many tries. Wait a few minutes.' }, 429)
  const payload = await readJson(c)
  if (!payload) return c.json({ ok: false, error: 'Send that again.' }, 400)
  const result = await authenticate(payload)
  if (!result.ok) {
    const status = result.error === 'That player name and password do not match.' ? 401 : 400
    return c.json(result, status)
  }
  const id = await openSession(result.user.id)
  writeSession(c, id)
  return c.json(result)
})

app.post('/api/auth/signout', async (c) => {
  const id = readSession(c.req.header('cookie'))
  if (id) await closeSession(id)
  writeSession(c, null)
  return c.json({ ok: true })
})

app.get('/api/auth/me', async (c) => {
  c.header('Cache-Control', 'no-store')
  const user = await userForSession(readSession(c.req.header('cookie')))
  return c.json({ user })
})

app.get('/api/admin/accounts', async (c) => {
  const gate = await demandDesk(c.req.header('cookie'))
  if (!gate.ok) return c.json({ ok: false, error: gate.error }, gate.status)
  c.header('Cache-Control', 'no-store')
  return c.json({ ok: true, ...listAccounts() })
})

app.post('/api/admin/staff', async (c) => {
  const gate = await demandDesk(c.req.header('cookie'))
  if (!gate.ok) return c.json({ ok: false, error: gate.error }, gate.status)
  const ip = clientIp(c.req.header('x-forwarded-for'))
  if (limited(ip, 'staff', 20)) return c.json({ ok: false, error: 'Too many tries. Wait a few minutes.' }, 429)
  const payload = await readJson(c)
  if (!payload) return c.json({ ok: false, error: 'Send that again.' }, 400)
  const result = await register(payload, 'admin')
  if (!result.ok) return c.json(result, 400)
  console.log(`Desk login added · ${result.user.username}`)
  return c.json(result, 201)
})

app.post('/api/holds', async (c) => {
  const gate = await requireUser(c.req.header('cookie'))
  if (!gate.ok) return c.json({ ok: false, error: gate.error }, gate.status)
  const ip = clientIp(c.req.header('x-forwarded-for'))
  if (limited(ip, 'hold', 20)) return c.json({ ok: false, error: 'Too many requests. Wait a few minutes.' }, 429)
  const payload = await readJson(c)
  if (!payload) return c.json({ ok: false, error: 'Send that again.' }, 400)
  const result = await createHold(gate.user, payload)
  if (!result.ok) return c.json(result, 400)
  console.log(`Hour request ${result.hold.id} · ${gate.user.username} ${result.hold.date} ${result.hold.hour}`)
  return c.json(result, 201)
})

app.get('/api/holds', async (c) => {
  const gate = await requireUser(c.req.header('cookie'))
  if (!gate.ok) return c.json({ ok: false, error: gate.error }, gate.status)
  c.header('Cache-Control', 'no-store')
  return c.json({ ok: true, holds: await holdsFor(gate.user.id) })
})

app.get('/api/admin/holds', async (c) => {
  const gate = await demandDesk(c.req.header('cookie'))
  if (!gate.ok) return c.json({ ok: false, error: gate.error }, gate.status)
  c.header('Cache-Control', 'no-store')
  return c.json({ ok: true, holds: await allHolds() })
})

app.post('/api/enquiries', async (c) => {
  const gate = await requireUser(c.req.header('cookie'))
  if (!gate.ok) return c.json({ ok: false, error: gate.error }, gate.status)
  const ip = clientIp(c.req.header('x-forwarded-for'))
  if (limited(ip, 'enquiry', 20)) {
    return c.json({ ok: false, error: 'Too many requests. Wait a few minutes.' }, 429)
  }

  const payload = await readJson(c)
  if (!payload) return c.json({ ok: false, error: 'Send that again.' }, 400)

  if (typeof payload.company === 'string' && payload.company.trim() !== '') {
    return c.json({ ok: true, id: 'held' }, 201)
  }

  const errors = validate(payload)
  if (Object.keys(errors).length > 0) {
    return c.json({ ok: false, errors }, 400)
  }

  const enquiry: Enquiry = {
    id: crypto.randomUUID(),
    name: String(payload.name).trim(),
    email: String(payload.email).trim(),
    date: String(payload.date),
    time: String(payload.time),
    format: payload.format as Format,
    note: typeof payload.note === 'string' ? payload.note.trim().slice(0, 400) : '',
    userId: gate.user.id,
    createdAt: new Date().toISOString(),
  }

  const rows = readAll()
  rows.push(enquiry)
  writeAll(rows)
  console.log(`Court request ${enquiry.id} · ${enquiry.date} ${enquiry.time} ${enquiry.format}`)
  return c.json({ ok: true, id: enquiry.id }, 201)
})

loadEnv()

const port = Number(process.env.PORT ?? 8787)

await warmAccounts()
await ensureDesk()

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API http://localhost:${info.port}`)
})

async function requireUser(cookie: string | undefined) {
  const user = await userForSession(readSession(cookie))
  if (!user) return { ok: false as const, status: 401 as const, error: 'Sign in first.' }
  return { ok: true as const, user }
}

async function demandDesk(cookie: string | undefined) {
  const gate = await requireUser(cookie)
  if (!gate.ok) return gate
  if (gate.user.role !== 'admin') return { ok: false as const, status: 403 as const, error: 'This gate is for the desk.' }
  return gate
}

function writeSession(c: { header: (name: string, value: string) => void }, id: string | null) {
  const value = id ?? ''
  const maxAge = id ? sessionMaxAge : 0
  c.header('Set-Cookie', `${sessionCookie}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`)
  c.header('Cache-Control', 'no-store')
}

function readSession(header: string | undefined) {
  if (!header) return null
  for (const part of header.split(';')) {
    const text = part.trim()
    const eq = text.indexOf('=')
    if (eq === -1) continue
    if (text.slice(0, eq) !== sessionCookie) continue
    try {
      return decodeURIComponent(text.slice(eq + 1))
    } catch {
      return null
    }
  }
  return null
}

async function readJson(c: { req: { json: () => Promise<unknown> } }) {
  try {
    const payload: unknown = await c.req.json()
    return isRecord(payload) ? payload : null
  } catch {
    return null
  }
}

function validate(body: Record<string, unknown>) {
  const errors: Record<string, string> = {}
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const date = typeof body.date === 'string' ? body.date : ''
  const time = typeof body.time === 'string' ? body.time : ''
  const format = typeof body.format === 'string' ? body.format : ''
  const note = typeof body.note === 'string' ? body.note.trim() : ''

  if (name.length < 2 || name.length > 80) errors.name = 'Add your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) errors.email = 'Check the email.'
  if (!validDay(date)) errors.date = 'Pick a day.'
  if (!times.includes(time)) errors.time = 'Pick a time.'
  if (!formats.includes(format as Format)) errors.format = 'Pick singles or doubles.'
  if (note.length > 400) errors.note = 'Keep the note shorter.'
  return errors
}

function validDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const picked = new Date(year, month - 1, day)
  if (picked.getFullYear() !== year || picked.getMonth() !== month - 1 || picked.getDate() !== day) {
    return false
  }
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const max = new Date(start)
  max.setDate(max.getDate() + 60)
  return picked >= start && picked <= max
}

function limited(ip: string, bucket: string, max: number) {
  const now = Date.now()
  const key = `${bucket}:${ip}`
  const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < 10 * 60 * 1000)
  if (recent.length >= max) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  return false
}

function clientIp(header: string | undefined) {
  return header?.split(',')[0]?.trim() || 'local'
}

function readAll(): Enquiry[] {
  if (!existsSync(dataFile)) return []
  try {
    const parsed: unknown = JSON.parse(readFileSync(dataFile, 'utf8'))
    return Array.isArray(parsed) ? (parsed as Enquiry[]) : []
  } catch {
    return []
  }
}

function writeAll(rows: Enquiry[]) {
  mkdirSync(dirname(dataFile), { recursive: true })
  writeFileSync(dataFile, JSON.stringify(rows, null, 2))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
