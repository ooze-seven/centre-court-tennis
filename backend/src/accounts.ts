import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bookError, bookReady, rest } from './db.js'
import { dummyHash, hashPassword, verifyPassword, warmPasswords } from './passwords.js'

export type Role = 'client' | 'admin'

export type PublicUser = {
  id: string
  firstName: string
  lastName: string
  username: string
  phone: string
  email: string
  role: Role
}

export type ListedAccount = PublicUser & { createdAt: string }

export type AccountErrors = Partial<
  Record<'firstName' | 'lastName' | 'username' | 'phone' | 'email' | 'password' | 'confirmPassword', string>
>

type StoredUser = ListedAccount & { passwordHash: string }

type UserRow = {
  id: string
  first_name: string
  last_name: string
  username: string
  phone: string
  email: string
  role: Role
  password_hash?: string
  created_at: string
}

type TakenName = { username_key: string; email_key: string }

type SessionRow = { id: string; user_id: string; expires_at: string }

type Failure = { ok: false; error?: string; errors?: AccountErrors }

type Draft = {
  firstName: string
  lastName: string
  username: string
  phone: string
  email: string
  password: string
}

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')
const sessionTtl = 14 * 24 * 60 * 60 * 1000
const closed = { ok: false as const, error: 'The book is not open yet. Run backend/supabase/schema.sql in the Supabase SQL editor.' }

let tail: Promise<void> = Promise.resolve()

export async function warmAccounts() {
  await warmPasswords()
}

export function register(input: unknown, role: Role) {
  return lock(() => insertUnlocked(input, role))
}

export async function authenticate(input: unknown): Promise<{ ok: true; user: PublicUser } | Failure> {
  if (!isRecord(input)) return { ok: false, error: 'Send that again.' }
  const username = typeof input.username === 'string' ? input.username.trim() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  if (!username || !password) return { ok: false, error: 'Add your player name and password.' }
  if (!(await bookReady())) return closed
  const user = await findUser(`username_key=eq.${encodeURIComponent(username.toLowerCase())}`)
  const match = await verifyPassword(password, user?.passwordHash ?? dummyHash())
  if (!user || !match) return { ok: false, error: 'That player name and password do not match.' }
  return { ok: true, user: toPublic(user) }
}

export function openSession(userId: string) {
  return lock(async () => {
    const id = randomBytes(32).toString('hex')
    await rest('sessions', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({ id, user_id: userId, expires_at: new Date(Date.now() + sessionTtl).toISOString() }),
    })
    return id
  })
}

export function closeSession(id: string) {
  return lock(async () => {
    await rest(`sessions?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  })
}

export function userForSession(id: string | null) {
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return Promise.resolve(null)
  return lock(async () => {
    if (!(await bookReady())) return null
    const rows = await rest<SessionRow[]>(`sessions?id=eq.${encodeURIComponent(id)}&select=id,user_id,expires_at&limit=1`)
    const session = rows[0]
    if (!session) return null
    if (Date.parse(session.expires_at) <= Date.now()) {
      await rest(`sessions?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
      return null
    }
    const user = await findUser(`id=eq.${session.user_id}`)
    return user ? toPublic(user) : null
  })
}

export async function listAccounts() {
  const users = await rest<UserRow[]>('users?select=id,first_name,last_name,username,phone,email,role,created_at&order=created_at.desc')
  const listed = (role: Role) => users.filter((user) => user.role === role).map(toListed)
  return { players: listed('client'), staff: listed('admin') }
}

export function ensureDesk() {
  return lock(async () => {
    if (!(await bookReady())) {
      console.log(closed.error)
      return
    }
    await adoptFiles()
    const username = process.env.ADMIN_USERNAME?.trim() ?? ''
    const password = process.env.ADMIN_PASSWORD ?? ''
    if (!username || !password) {
      console.log('No desk login yet. Set ADMIN_USERNAME and ADMIN_PASSWORD in backend/.env')
      return
    }
    const existing = await findUser(`username_key=eq.${encodeURIComponent(username.toLowerCase())}`)
    if (existing?.role === 'admin') return
    if (existing) {
      console.log(`Desk login skipped. ${existing.username} is already a player.`)
      return
    }
    const created = await insertUnlocked(
      {
        firstName: process.env.ADMIN_FIRST_NAME ?? 'Desk',
        lastName: process.env.ADMIN_LAST_NAME ?? 'Centrecourt',
        username,
        phone: process.env.ADMIN_PHONE ?? '09000000000',
        email: process.env.ADMIN_EMAIL ?? 'desk@centrecourt.local',
        password,
        confirmPassword: password,
      },
      'admin',
    )
    if (!created.ok) {
      console.log('Desk login skipped. Check the admin values in backend/.env')
      return
    }
    console.log(`Desk login ready · player name ${created.user.username}`)
  })
}

async function insertUnlocked(input: unknown, role: Role): Promise<{ ok: true; user: ListedAccount } | Failure> {
  const parsed = parseAccount(input)
  if (!parsed.ok) return parsed
  if (!(await bookReady())) return closed
  const taken = await rest<TakenName[]>(
    `users?select=username_key,email_key&or=(username_key.eq.${encodeURIComponent(parsed.username.toLowerCase())},email_key.eq.${encodeURIComponent(parsed.email.toLowerCase())})`,
  )
  const errors: AccountErrors = {}
  if (taken.some((user) => user.username_key === parsed.username.toLowerCase())) {
    errors.username = 'That player name is already on the book.'
  }
  if (taken.some((user) => user.email_key === parsed.email.toLowerCase())) {
    errors.email = 'That email is already on the book.'
  }
  if (errors.username || errors.email) return { ok: false, errors }
  const passwordHash = await hashPassword(parsed.password)
  const stored: StoredUser = {
    id: crypto.randomUUID(),
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    username: parsed.username,
    phone: parsed.phone,
    email: parsed.email,
    role,
    passwordHash,
    createdAt: new Date().toISOString(),
  }
  try {
    await rest('users', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify(toRow(stored)),
    })
  } catch (error) {
    const book = bookError(error)
    if (book?.code === '23505' && book.message.includes('users_username_unique')) {
      return { ok: false, errors: { username: 'That player name is already on the book.' } }
    }
    if (book?.code === '23505' && book.message.includes('users_email_unique')) {
      return { ok: false, errors: { email: 'That email is already on the book.' } }
    }
    throw error
  }
  return { ok: true, user: toListed(stored) }
}

async function findUser(filter: string) {
  const rows = await rest<UserRow[]>(`users?${filter}&select=id,first_name,last_name,username,phone,email,role,password_hash,created_at&limit=1`)
  return rows[0] ? fromRow(rows[0]) : null
}

async function adoptFiles() {
  const present = await rest<Pick<UserRow, 'id'>[]>('users?select=id&limit=1')
  if (present.length > 0) return
  const users = readList(join(dataDir, 'users.json')).filter((row): row is StoredUser => isStoredUser(row))
  if (users.length > 0) {
    await rest('users', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify(users.map(toRow)),
    })
  }
  const now = Date.now()
  const sessions = readList(join(dataDir, 'sessions.json')).flatMap((row) => {
    if (!isRecord(row) || typeof row.id !== 'string' || typeof row.userId !== 'string' || typeof row.expiresAt !== 'number') return []
    if (row.expiresAt <= now) return []
    return [{ id: row.id, user_id: row.userId, expires_at: new Date(row.expiresAt).toISOString() }]
  })
  if (sessions.length > 0) {
    await rest('sessions', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify(sessions),
    })
  }
}

function readList(file: string): unknown[] {
  if (!existsSync(file)) return []
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseAccount(input: unknown): ({ ok: true } & Draft) | Failure {
  if (!isRecord(input)) return { ok: false, error: 'Send that again.' }
  const firstName = cleanName(input.firstName)
  const lastName = cleanName(input.lastName)
  const username = typeof input.username === 'string' ? input.username.trim() : ''
  const phone = typeof input.phone === 'string' ? input.phone.trim() : ''
  const email = typeof input.email === 'string' ? input.email.trim() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  const confirmPassword = typeof input.confirmPassword === 'string' ? input.confirmPassword : ''
  const errors: AccountErrors = {}
  if (!validName(firstName)) errors.firstName = 'Add your first name.'
  if (!validName(lastName)) errors.lastName = 'Add your last name.'
  if (!/^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/i.test(username)) {
    errors.username = 'Use 3 to 20 letters or numbers. A player name has to stay unique.'
  }
  const digits = phone.replace(/\D/g, '')
  if (phone.length > 24 || digits.length < 10 || digits.length > 13) errors.phone = 'Check the phone number.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) errors.email = 'Check the email.'
  if (password.length < 8 || password.length > 128) errors.password = 'Use at least 8 characters.'
  if (!confirmPassword) errors.confirmPassword = 'Type the password again.'
  else if (password !== confirmPassword) errors.confirmPassword = 'Those passwords do not match.'
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, firstName, lastName, username, phone, email, password }
}

function validName(value: string) {
  return value.length >= 2 && value.length <= 40 && /^[\p{L}][\p{L}\s'.-]*$/u.test(value)
}

function cleanName(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ')
}

function toPublic(user: StoredUser): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    phone: user.phone,
    email: user.email,
    role: user.role,
  }
}

function toListed(user: StoredUser | UserRow): ListedAccount {
  if ('firstName' in user) return { ...toPublic(user), createdAt: user.createdAt }
  return { ...toPublic(fromRow(user)), createdAt: user.created_at }
}

function toRow(user: StoredUser) {
  return {
    id: user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    username: user.username,
    phone: user.phone,
    email: user.email,
    role: user.role,
    password_hash: user.passwordHash,
    created_at: user.createdAt,
  }
}

function fromRow(row: UserRow): StoredUser {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    phone: row.phone,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash ?? '',
    createdAt: row.created_at,
  }
}

function lock<T>(task: () => Promise<T>) {
  const run = tail.then(task, task)
  tail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function isStoredUser(value: unknown): value is StoredUser {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.firstName === 'string' &&
    typeof value.lastName === 'string' &&
    typeof value.username === 'string' &&
    typeof value.phone === 'string' &&
    typeof value.email === 'string' &&
    (value.role === 'client' || value.role === 'admin') &&
    typeof value.passwordHash === 'string' &&
    typeof value.createdAt === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
