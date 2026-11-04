import { serve } from '@hono/node-server'
import { existsSync, readFileSync } from 'node:fs'
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
import { bookReady, rest } from './db.js'
import { loadEnv } from './env.js'
import { allHolds, createHold, holdByPass, holdsFor, takenSlots } from './holds.js'
import { clientAddress, limited } from './limit.js'

const sessionCookie = 'cct_session'
const sessionMaxAge = 14 * 24 * 60 * 60

type Enquiry = {
  id: string
  name: string
  email: string
  date: string
  time: string
  format: string
  note: string
  userId: string
  createdAt: string
}

const dataFile = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'enquiries.json')

const app = new Hono()

app.use(
  '*',
  cors({
    origin: (origin) => (allowedOrigins().includes(origin) ? origin : null),
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.get('/api/health', (c) => c.json({ ok: true }))

app.post('/api/auth/signup', async (c) => {
  const ip = clientAddress(c.req.header('x-forwarded-for'))
  if (await limited(ip, 'signup', 20)) return c.json({ ok: false, error: 'Too many tries. Wait a few minutes.' }, 429)
  const payload = await readJson(c)
  if (!payload) return c.json({ ok: false, error: 'Send that again.' }, 400)
  const result = await register(payload, 'client')
  if (!result.ok) return c.json(result, 400)
  const id = await openSession(result.user.id)
  writeSession(c, id)
  console.log(`Player joined · ${result.user.username}`)
  return c.json({ ok: true, user: result.user, token: id }, 201)
})

app.post('/api/auth/signin', async (c) => {
  const ip = clientAddress(c.req.header('x-forwarded-for'))
  if (await limited(ip, 'signin', 40)) return c.json({ ok: false, error: 'Too many tries. Wait a few minutes.' }, 429)
  const payload = await readJson(c)
  if (!payload) return c.json({ ok: false, error: 'Send that again.' }, 400)
  const result = await authenticate(payload)
  if (!result.ok) {
    const status = result.error === 'That player name and password do not match.' ? 401 : 400
    return c.json(result, status)
  }
  const id = await openSession(result.user.id)
  writeSession(c, id)
  return c.json({ ...result, token: id })
})

app.post('/api/auth/signout', async (c) => {
  for (const id of presentedSessions(c)) await closeSession(id)
  writeSession(c, null)
  return c.json({ ok: true })
})

app.get('/api/auth/me', async (c) => {
  c.header('Cache-Control', 'no-store')
  const found = await openGate(c)
  if (found && 'closed' in found) return c.json({ ok: false, error: 'The book is not open yet.' }, 503)
  return c.json({ user: found && 'user' in found ? found.user : null })
})

app.get('/api/admin/accounts', async (c) => {
  const gate = await demandDesk(c)
  if (!gate.ok) return c.json({ ok: false, error: gate.error }, gate.status)
  c.header('Cache-Control', 'no-store')
  return c.json({ ok: true, ...(await listAccounts()) })
})

app.post('/api/admin/staff', async (c) => {
  const gate = await demandDesk(c)
  if (!gate.ok) return c.json({ ok: false, error: gate.error }, gate.status)
  const ip = clientAddress(c.req.header('x-forwarded-for'))
  if (await limited(ip, 'staff', 20)) return c.json({ ok: false, error: 'Too many tries. Wait a few minutes.' }, 429)
  const payload = await readJson(c)
  if (!payload) return c.json({ ok: false, error: 'Send that again.' }, 400)
  const result = await register(payload, 'admin')
  if (!result.ok) return c.json(result, 400)
  console.log(`Desk login added · ${result.user.username}`)
  return c.json(result, 201)
})

app.post('/api/holds', async (c) => {
  const gate = await requireUser(c)
  if (!gate.ok) return c.json({ ok: false, error: gate.error }, gate.status)
  const ip = clientAddress(c.req.header('x-forwarded-for'))
  if (await limited(ip, 'hold', 20)) return c.json({ ok: false, error: 'Too many requests. Wait a few minutes.' }, 429)
  const payload = await readJson(c)
  if (!payload) return c.json({ ok: false, error: 'Send that again.' }, 400)
  const result = await createHold(gate.user, payload)
  if (!result.ok) return c.json(result, 400)
  console.log(`Hour request ${result.hold.id} · ${gate.user.username} ${result.hold.date} ${result.hold.hour}`)
  return c.json(result, 201)
})

app.get('/api/court/taken', async (c) => {
  c.header('Cache-Control', 'no-store')
  return c.json({ ok: true, slots: await takenSlots() })
})

app.get('/api/holds', async (c) => {
  const gate = await requireUser(c)
  if (!gate.ok) return c.json({ ok: false, error: gate.error }, gate.status)
  c.header('Cache-Control', 'no-store')
  return c.json({ ok: true, holds: await holdsFor(gate.user.id) })
})

app.get('/api/admin/passes/:code', async (c) => {
  const gate = await demandDesk(c)
  if (!gate.ok) return c.json({ ok: false, error: gate.error }, gate.status)
  const ip = clientAddress(c.req.header('x-forwarded-for'))
  if (await limited(ip, 'pass', 40)) return c.json({ ok: false, error: 'Too many tries. Wait a few minutes.' }, 429)
  c.header('Cache-Control', 'no-store')
  const found = await holdByPass(c.req.param('code'))
  if (!found) return c.json({ ok: false, error: 'That pass is not on the book.' }, 404)
  return c.json({ ok: true, ...found })
})

app.get('/api/admin/holds', async (c) => {
  const gate = await demandDesk(c)
  if (!gate.ok) return c.json({ ok: false, error: gate.error }, gate.status)
  c.header('Cache-Control', 'no-store')
  const holds = (await allHolds()).map(({ pass: _pass, ...hold }) => hold)
  return c.json({ ok: true, holds })
})

loadEnv()

const port = Number(process.env.PORT ?? 8787)

await warmAccounts()
await ensureDesk()
await adoptEnquiries()

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API http://localhost:${info.port}`)
})

type RequestHead = { req: { header: (name: string) => string | undefined } }

function bearerSession(header: string | undefined) {
  if (!header) return null
  const match = /^Bearer\s+([a-f0-9]{64})$/i.exec(header.trim())
  return match ? match[1].toLowerCase() : null
}

function presentedSessions(c: RequestHead) {
  const ids = [bearerSession(c.req.header('authorization')), readSession(c.req.header('cookie'))]
  return [...new Set(ids.filter((id): id is string => Boolean(id && /^[a-f0-9]{64}$/.test(id))))]
}

async function openGate(c: RequestHead) {
  let closed = false
  for (const id of presentedSessions(c)) {
    const look = await userForSession(id)
    if (look.kind === 'user') return { id, user: look.user }
    if (look.kind === 'closed') closed = true
  }
  if (closed) return { closed: true as const }
  return null
}

async function requireUser(c: RequestHead) {
  const found = await openGate(c)
  if (found && 'closed' in found) return { ok: false as const, status: 503 as const, error: 'The book is not open yet.' }
  if (!found || !('user' in found)) return { ok: false as const, status: 401 as const, error: 'Sign in first.' }
  return { ok: true as const, user: found.user }
}

async function demandDesk(c: RequestHead) {
  const gate = await requireUser(c)
  if (!gate.ok) return gate
  if (gate.user.role !== 'admin') return { ok: false as const, status: 403 as const, error: 'This gate is for the desk.' }
  return gate
}

function writeSession(c: { header: (name: string, value: string) => void }, id: string | null) {
  const value = id ?? ''
  const maxAge = id ? sessionMaxAge : 0
  const secure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production'
  const sameSite = secure ? 'None' : 'Lax'
  const secureFlag = secure ? '; Secure' : ''
  const partitioned = secure ? '; Partitioned' : ''
  c.header(
    'Set-Cookie',
    `${sessionCookie}=${value}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${maxAge}${secureFlag}${partitioned}`,
  )
  c.header('Cache-Control', 'no-store')
}

function allowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173'
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
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

async function adoptEnquiries() {
  if (!(await bookReady()) || !existsSync(dataFile)) return
  const present = await rest<Array<{ id: string }>>('enquiries?select=id&limit=1')
  if (present.length > 0) return
  try {
    const parsed: unknown = JSON.parse(readFileSync(dataFile, 'utf8'))
    if (!Array.isArray(parsed) || parsed.length === 0) return
    await rest('enquiries', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify(
        (parsed as Enquiry[]).map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          date: row.date,
          time: row.time,
          format: row.format,
          note: row.note,
          user_id: row.userId,
          created_at: row.createdAt,
        })),
      ),
    })
  } catch {
    return
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
