import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
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

type Session = { id: string; userId: string; expiresAt: number }

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
const userFile = join(dataDir, 'users.json')
const sessionFile = join(dataDir, 'sessions.json')
const sessionTtl = 14 * 24 * 60 * 60 * 1000

let usersCache: StoredUser[] | null = null
let sessionsCache: Session[] | null = null
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
  const user = loadUsers().find((item) => item.username.toLowerCase() === username.toLowerCase())
  const match = await verifyPassword(password, user?.passwordHash ?? dummyHash())
  if (!user || !match) return { ok: false, error: 'That player name and password do not match.' }
  return { ok: true, user: toPublic(user) }
}

export function openSession(userId: string) {
  return lock(async () => {
    const sessions = liveSessions()
    const id = randomBytes(32).toString('hex')
    sessions.push({ id, userId, expiresAt: Date.now() + sessionTtl })
    saveSessions(sessions)
    return id
  })
}

export function closeSession(id: string) {
  return lock(async () => {
    saveSessions(loadSessions().filter((session) => session.id !== id))
  })
}

export function userForSession(id: string | null) {
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return Promise.resolve(null)
  return lock(async () => {
    const sessions = liveSessions()
    if (sessions.length !== loadSessions().length) saveSessions(sessions)
    const session = sessions.find((item) => item.id === id)
    if (!session) return null
    const user = loadUsers().find((item) => item.id === session.userId)
    return user ? toPublic(user) : null
  })
}

export function listAccounts() {
  const users = loadUsers()
  const listed = (role: Role) =>
    users
      .filter((user) => user.role === role)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map(toListed)
  return { players: listed('client'), staff: listed('admin') }
}

export function ensureDesk() {
  return lock(async () => {
    const username = process.env.ADMIN_USERNAME?.trim() ?? ''
    const password = process.env.ADMIN_PASSWORD ?? ''
    if (!username || !password) {
      console.log('No desk login yet. Set ADMIN_USERNAME and ADMIN_PASSWORD in backend/.env')
      return
    }
    const existing = loadUsers().find((user) => user.username.toLowerCase() === username.toLowerCase())
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
  const users = loadUsers()
  const errors: AccountErrors = {}
  if (users.some((user) => user.username.toLowerCase() === parsed.username.toLowerCase())) {
    errors.username = 'That player name is already on the book.'
  }
  if (users.some((user) => user.email.toLowerCase() === parsed.email.toLowerCase())) {
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
  users.push(stored)
  saveUsers(users)
  return { ok: true, user: toListed(stored) }
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

function toListed(user: StoredUser): ListedAccount {
  return { ...toPublic(user), createdAt: user.createdAt }
}

function loadUsers() {
  if (usersCache) return usersCache
  if (!existsSync(userFile)) {
    usersCache = []
    return usersCache
  }
  const parsed: unknown = JSON.parse(readFileSync(userFile, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error('backend/data/users.json is not a list')
  usersCache = parsed as StoredUser[]
  return usersCache
}

function saveUsers(users: StoredUser[]) {
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(userFile, JSON.stringify(users, null, 2))
  usersCache = users
}

function loadSessions() {
  if (sessionsCache) return sessionsCache
  if (!existsSync(sessionFile)) {
    sessionsCache = []
    return sessionsCache
  }
  const parsed: unknown = JSON.parse(readFileSync(sessionFile, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error('backend/data/sessions.json is not a list')
  sessionsCache = parsed as Session[]
  return sessionsCache
}

function liveSessions() {
  const now = Date.now()
  return loadSessions().filter((session) => session.expiresAt > now)
}

function saveSessions(sessions: Session[]) {
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(sessionFile, JSON.stringify(sessions, null, 2))
  sessionsCache = sessions
}

function lock<T>(task: () => Promise<T>) {
  const run = tail.then(task, task)
  tail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
