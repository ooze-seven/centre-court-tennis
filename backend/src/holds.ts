import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PublicUser } from './accounts.js'
import { courtDayIndex, courtInstant, courtParts, isRealDay } from './court-time.js'
import { bookError, bookReady, rest } from './db.js'

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

type HoldRow = {
  id: string
  user_id: string
  first_name: string
  last_name: string
  username: string
  phone: string
  email: string
  date: string
  hour: number
  coach: boolean
  pass: string
  created_at: string
}

export function createHold(user: PublicUser, input: unknown) {
  return lock(async () => {
    const parsed = parseHold(input)
    if (!parsed.ok) return parsed
    if (!(await bookReady())) return { ok: false as const, error: 'The book is not open yet.' }
    await adoptHoldFile()
    const rows = await readHolds()
    const block = holdBlock(rows, user.id, parsed.date, parsed.hour)
    if (block) return { ok: false as const, error: block }
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
    try {
      await rest('holds', {
        method: 'POST',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify(toRow(hold)),
      })
    } catch (error) {
      const detail = bookError(error)?.message ?? ''
      if (detail.includes('holds_one_hour')) return { ok: false as const, error: 'That hour is already held.' }
      if (detail.includes('holds_one_per_player')) {
        return { ok: false as const, error: 'That hour is already in your request.' }
      }
      throw error
    }
    return { ok: true as const, hold: toPlayer(hold) }
  })
}

export function takenSlots() {
  return lock(async () => {
    const rows = await rest<{ date: string; hour: number }[]>('holds?select=date,hour')
    return rows.map((row) => ({ date: String(row.date).slice(0, 10), hour: row.hour }))
  })
}

export function holdsFor(userId: string) {
  return lock(async () => {
    await adoptHoldFile()
    const rows = await readHolds()
    return rows.filter((hold) => hold.userId === userId).map(toPlayer)
  })
}

export function allHolds() {
  return lock(async () => {
    await adoptHoldFile()
    return (await readHolds()).sort(
      (a, b) => a.date.localeCompare(b.date) || a.hour - b.hour || a.createdAt.localeCompare(b.createdAt),
    )
  })
}

export function holdByPass(code: string) {
  return lock(async (): Promise<PassLook | null> => {
    const pass = code.trim().toLowerCase()
    if (!isPass(pass)) return null
    await adoptHoldFile()
    const rows = await rest<HoldRow[]>(`holds?pass=eq.${encodeURIComponent(pass)}&select=*&limit=1`)
    const hold = rows[0] ? fromRow(rows[0]) : null
    if (!hold?.pass) return null
    return {
      gate: judgePass(hold.date, hold.hour),
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
  if (!dayOnBoard(date)) return { ok: false, error: 'Pick a day on the board.' }
  if (typeof hour !== 'number' || !Number.isInteger(hour) || hour < 0 || hour > 23) {
    return { ok: false, error: 'Pick an hour on the board.' }
  }
  if (typeof coach !== 'boolean') return { ok: false, error: 'Say if you need a coach.' }
  if (hourHasPassed(date, hour)) return { ok: false, error: 'That hour has passed.' }
  return { ok: true, date, hour, coach }
}

export function hourHasPassed(date: string, hour: number, now = Date.now()) {
  const start = courtInstant(date.slice(0, 10), hour)
  return Number.isFinite(start) && start <= now
}

export function dayOnBoard(value: string, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!isRealDay(year, month, day)) return false
  const today = courtParts(now)
  const start = courtDayIndex(today.year, today.month, today.day)
  const picked = courtDayIndex(year, month, day)
  return picked >= start && picked <= start + 60
}

export function holdBlock(
  rows: { userId: string; date: string; hour: number }[],
  userId: string,
  date: string,
  hour: number,
) {
  const day = date.slice(0, 10)
  const same = rows.filter((hold) => hold.date.slice(0, 10) === day && hold.hour === hour)
  if (same.some((hold) => hold.userId === userId)) return 'That hour is already in your request.'
  if (same.length > 0) return 'That hour is already held.'
  return null
}

function toPlayer(hold: StoredHold): PlayerHold {
  return { id: hold.id, date: hold.date, hour: hold.hour, coach: hold.coach, pass: hold.pass ?? '' }
}

async function readHolds() {
  const rows = await rest<HoldRow[]>('holds?select=*')
  const holds = rows.map(fromRow)
  const used = new Set(holds.map((hold) => hold.pass).filter((pass): pass is string => Boolean(pass)))
  for (const hold of holds) {
    if (hold.pass && isPass(hold.pass)) continue
    hold.pass = mintPass(used)
    used.add(hold.pass)
    await rest(`holds?id=eq.${hold.id}`, {
      method: 'PATCH',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({ pass: hold.pass }),
    })
  }
  return holds
}

async function adoptHoldFile() {
  const present = await rest<Pick<HoldRow, 'id'>[]>('holds?select=id&limit=1')
  if (present.length > 0 || !existsSync(file)) return
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
  if (!Array.isArray(parsed) || parsed.length === 0) return
  const rows = (parsed as StoredHold[]).map((hold) => toRow({ ...hold, pass: hold.pass ?? mintPass(new Set()) }))
  await rest('holds', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify(rows) })
}

function toRow(hold: StoredHold) {
  return {
    id: hold.id,
    user_id: hold.userId,
    first_name: hold.firstName,
    last_name: hold.lastName,
    username: hold.username,
    phone: hold.phone,
    email: hold.email,
    date: hold.date,
    hour: hold.hour,
    coach: hold.coach,
    pass: hold.pass ?? '',
    created_at: hold.createdAt,
  }
}

function fromRow(row: HoldRow): StoredHold {
  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    phone: row.phone,
    email: row.email,
    date: row.date,
    hour: row.hour,
    coach: row.coach,
    pass: row.pass,
    createdAt: row.created_at,
  }
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

export function judgePass(date: string, hour: number, now = Date.now()): PassGate {
  const start = courtInstant(date.slice(0, 10), hour)
  if (!Number.isFinite(start) || now >= start + 60 * 60 * 1000) return 'late'
  if (now < start - 10 * 60 * 1000) return 'early'
  return 'now'
}

function lock<T>(job: () => Promise<T>): Promise<T> {
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
