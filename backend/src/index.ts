import { serve } from '@hono/node-server'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const times = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
const formats = ['singles', 'doubles'] as const

type Format = (typeof formats)[number]

type Enquiry = {
  id: string
  name: string
  email: string
  date: string
  time: string
  format: Format
  note: string
  createdAt: string
}

const dataFile = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'enquiries.json')
const hits = new Map<string, number[]>()

const app = new Hono()

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  }),
)

app.get('/api/health', (c) => c.json({ ok: true }))

app.get('/api/court', (c) => c.json({ formats, times }))

app.post('/api/enquiries', async (c) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (limited(ip)) {
    return c.json({ ok: false, error: 'Too many requests. Wait a few minutes.' }, 429)
  }

  let payload: unknown
  try {
    payload = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'Send that again.' }, 400)
  }

  if (!isRecord(payload)) {
    return c.json({ ok: false, error: 'Send that again.' }, 400)
  }

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
    createdAt: new Date().toISOString(),
  }

  const rows = readAll()
  rows.push(enquiry)
  writeAll(rows)
  console.log(`Court request ${enquiry.id} · ${enquiry.date} ${enquiry.time} ${enquiry.format}`)
  return c.json({ ok: true, id: enquiry.id }, 201)
})

const port = Number(process.env.PORT ?? 8787)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API http://localhost:${info.port}`)
})

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

function limited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((stamp) => now - stamp < 10 * 60 * 1000)
  if (recent.length >= 20) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  return false
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
