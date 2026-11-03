import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PublicUser } from './accounts.js'

const passAlphabet = 'abcdefghjkmnpqrstuvwxyz23456789'

export type StoredHold = {
  id: string
  userId: string
  firstName: string
  lastName: string
  username: string
  phone: string
  email: string
  date: string
  hour: number
  coach: boolean
  pass?: string
  createdAt: string
}

export type PlayerHold = {
  id: string
  date: string
  hour: number
  coach: boolean
  pass: string
}

export type PassGate = 'now' | 'early' | 'late'

export type PassLook = {
  gate: PassGate
  firstName: string
  lastName: string
  username: string
  phone: string
  date: string
  hour: number
  coach: boolean
}

const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'holds.json')
let tail: Promise<void> = Promise.resolve()

export function createHold(user: PublicUser, input: unknown) {
  return lock(() => {
    const parsed = parseHold(input)
    if (!parsed.ok) return parsed
    const rows = withPasses(readHolds())
    const same = rows.some(
      (hold) => hold.userId === user.id && hold.date === parsed.date && hold.hour === parsed.hour,
    )
    if (same) return { ok: false as const, error: 'That hour is already in your request.' }
    const used = new Set(rows.map((hold) => hold.pass).filter((pass): pass is string => Boolean(pass)))
    const hold: StoredHold = {
      id: crypto.randomUUID(),
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      phone: user.phone,
      email: user.email,
      date: parsed.date,
      hour: parsed.hour,
      coach: parsed.coach,
      pass: mintPass(used),
      createdAt: new Date().toISOString(),
    }
    rows.push(hold)
    writeHolds(rows)
    return { ok: true as const, hold: toPlayer(hold) }
  })
}

export function holdsFor(userId: string) {
  return lock(() => withPasses(readHolds()).filter((hold) => hold.userId === userId).map(toPlayer))
}

export function allHolds() {
  return lock(() =>
    withPasses(readHolds())
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour || a.createdAt.localeCompare(b.createdAt)),
  )
}

export function holdByPass(code: string) {
  return lock((): PassLook | null => {
    const pass = code.trim().toLowerCase()
    if (!isPass(pass)) return null
    const hold = withPasses(readHolds()).find((item) => item.pass === pass)
    if (!hold?.pass) return null
    return {
      gate: passGate(hold),
      firstName: hold.firstName,
      lastName: hold.lastName,
      username: hold.username,
      phone: hold.phone,
      date: hold.date,
      hour: hold.hour,
      coach: hold.coach,
    }
  })
}

function parseHold(input: unknown): { ok: true; date: string; hour: number; coach: boolean } | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: 'Send that again.' }
  const date = typeof input.date === 'string' ? input.date : ''
  const hour = input.hour
  const coach = input.coach
  if (!openDay(date)) return { ok: false, error: 'Pick a day on the board.' }
  if (typeof hour !== 'number' || !Number.isInteger(hour) || hour < 0 || hour > 23) {
    return { ok: false, error: 'Pick an hour on the board.' }
  }
  if (typeof coach !== 'boolean') return { ok: false, error: 'Say if you need a coach.' }
  const [year, month, day] = date.split('-').map(Number)
  if (new Date(year, month - 1, day, hour).getTime() <= Date.now()) {
    return { ok: false, error: 'That hour has passed.' }
  }
  return { ok: true, date, hour, coach }
}

function openDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const picked = new Date(year, month - 1, day)
  if (picked.getFullYear() !== year || picked.getMonth() !== month - 1 || picked.getDate() !== day) return false
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const max = new Date(start)
  max.setDate(max.getDate() + 60)
  return picked >= start && picked <= max
}

function toPlayer(hold: StoredHold): PlayerHold {
  return { id: hold.id, date: hold.date, hour: hold.hour, coach: hold.coach, pass: hold.pass ?? '' }
}

function withPasses(rows: StoredHold[]) {
  const used = new Set(rows.map((hold) => hold.pass).filter((pass): pass is string => Boolean(pass)))
  let changed = false
  for (const hold of rows) {
    if (hold.pass && isPass(hold.pass)) continue
    hold.pass = mintPass(used)
    used.add(hold.pass)
    changed = true
  }
  if (changed) writeHolds(rows)
  return rows
}

function mintPass(used: Set<string>) {
  const bytes = new Uint8Array(10)
  for (let attempt = 0; attempt < 8; attempt += 1) {
    crypto.getRandomValues(bytes)
    const pass = [...bytes].map((byte) => passAlphabet[byte % passAlphabet.length]).join('')
    if (!used.has(pass)) return pass
  }
  throw new Error('Could not mint a pass')
}

function isPass(value: string) {
  return new RegExp(`^[${passAlphabet}]{10}$`).test(value)
}

function passGate(hold: StoredHold): PassGate {
  const [year, month, day] = hold.date.split('-').map(Number)
  const start = new Date(year, month - 1, day, hold.hour).getTime()
  const now = Date.now()
  if (now < start - 10 * 60 * 1000) return 'early'
  if (now >= start + 60 * 60 * 1000) return 'late'
  return 'now'
}

function readHolds(): StoredHold[] {
  if (!existsSync(file)) return []
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error('backend/data/holds.json is not a list')
  return parsed as StoredHold[]
}

function writeHolds(rows: StoredHold[]) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(rows, null, 2))
}

function lock<T>(job: () => T): Promise<T> {
  const run = tail.then(job, job)
  tail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
