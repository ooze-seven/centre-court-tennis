import { createContext, useContext } from 'react'
import type { AccountDraft, AccountErrors } from './account.ts'

export type Role = 'client' | 'admin'

export type SessionUser = {
  id: string
  firstName: string
  lastName: string
  username: string
  phone: string
  email: string
  role: Role
}

export type ListedAccount = SessionUser & { createdAt: string }

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error?: string; errors?: AccountErrors }

export type AuthValue = {
  user: SessionUser | null
  ready: boolean
  signIn: (username: string, password: string) => Promise<AuthResult>
  signUp: (draft: AccountDraft) => Promise<AuthResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is missing')
  return value
}

export async function requestSession() {
  const payload = await send('/api/auth/me')
  if (!isRecord(payload) || payload.user == null) return null
  if (!isSessionUser(payload.user)) throw new Error('The gate did not answer. Try again.')
  return payload.user
}

export async function requestSignIn(username: string, password: string) {
  return readAuth(await send('/api/auth/signin', { username, password }))
}

export async function requestSignUp(draft: AccountDraft) {
  return readAuth(await send('/api/auth/signup', draft))
}

export async function requestSignOut() {
  const payload = await send('/api/auth/signout', {})
  if (!isRecord(payload) || payload.ok !== true) throw new Error('The gate did not answer. Try again.')
}

export async function requestStaff(draft: AccountDraft) {
  const payload = await send('/api/admin/staff', draft)
  if (isRecord(payload) && payload.ok === true && isListed(payload.user)) {
    return { ok: true as const, user: payload.user }
  }
  if (isRecord(payload) && payload.ok === false) {
    return {
      ok: false as const,
      error: typeof payload.error === 'string' ? payload.error : undefined,
      errors: isErrors(payload.errors) ? payload.errors : undefined,
    }
  }
  throw new Error('The gate did not answer. Try again.')
}

export type CourtHold = {
  id: string
  date: string
  hour: number
  coach: boolean
}

export type DeskHold = CourtHold & {
  userId: string
  firstName: string
  lastName: string
  username: string
  phone: string
  email: string
  createdAt: string
}

export async function requestHold(input: { date: string; hour: number; coach: boolean }) {
  const payload = await send('/api/holds', input)
  if (isRecord(payload) && payload.ok === true && isCourtHold(payload.hold)) {
    return { ok: true as const, hold: payload.hold }
  }
  if (isRecord(payload) && payload.ok === false) {
    return {
      ok: false as const,
      error: typeof payload.error === 'string' ? payload.error : 'The desk did not take that hour.',
    }
  }
  throw new Error('The gate did not answer. Try again.')
}

export async function requestMyHolds() {
  const payload = await send('/api/holds')
  if (!isRecord(payload) || payload.ok !== true || !Array.isArray(payload.holds) || !payload.holds.every(isCourtHold)) {
    const error = isRecord(payload) && typeof payload.error === 'string' ? payload.error : 'The desk did not open your hours.'
    throw new Error(error)
  }
  return payload.holds
}

export async function requestDeskHolds() {
  const payload = await send('/api/admin/holds')
  if (!isRecord(payload) || payload.ok !== true || !Array.isArray(payload.holds) || !payload.holds.every(isDeskHold)) {
    const error = isRecord(payload) && typeof payload.error === 'string' ? payload.error : 'The desk did not open the hours.'
    throw new Error(error)
  }
  return payload.holds
}

export async function requestBook() {
  const payload = await send('/api/admin/accounts')
  if (!isRecord(payload) || payload.ok !== true || !Array.isArray(payload.players) || !Array.isArray(payload.staff)) {
    const error = isRecord(payload) && typeof payload.error === 'string' ? payload.error : 'The book did not open.'
    throw new Error(error)
  }
  if (!payload.players.every(isListed) || !payload.staff.every(isListed)) throw new Error('The book did not open.')
  return { players: payload.players, staff: payload.staff }
}

function apiUrl(path: string) {
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
  return `${base}${path}`
}

async function send(path: string, body?: unknown) {
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'include',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('The gate did not answer. Try again.')
  }
  try {
    return (await response.json()) as unknown
  } catch {
    throw new Error('The gate did not answer. Try again.')
  }
}

function readAuth(payload: unknown): AuthResult {
  if (isRecord(payload) && payload.ok === true && isSessionUser(payload.user)) return { ok: true, user: payload.user }
  if (isRecord(payload) && payload.ok === false) {
    return {
      ok: false,
      error: typeof payload.error === 'string' ? payload.error : undefined,
      errors: isErrors(payload.errors) ? payload.errors : undefined,
    }
  }
  throw new Error('The gate did not answer. Try again.')
}

function isSessionUser(value: unknown): value is SessionUser {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.firstName === 'string' &&
    typeof value.lastName === 'string' &&
    typeof value.username === 'string' &&
    typeof value.phone === 'string' &&
    typeof value.email === 'string' &&
    (value.role === 'client' || value.role === 'admin')
  )
}

function isCourtHold(value: unknown): value is CourtHold {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.date === 'string' &&
    typeof value.hour === 'number' &&
    typeof value.coach === 'boolean'
  )
}

function isDeskHold(value: unknown): value is DeskHold {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.date === 'string' &&
    typeof value.hour === 'number' &&
    typeof value.coach === 'boolean' &&
    typeof value.userId === 'string' &&
    typeof value.firstName === 'string' &&
    typeof value.lastName === 'string' &&
    typeof value.username === 'string' &&
    typeof value.phone === 'string' &&
    typeof value.email === 'string' &&
    typeof value.createdAt === 'string'
  )
}

function isListed(value: unknown): value is ListedAccount {
  return isRecord(value) && typeof value.createdAt === 'string' && isSessionUser(value)
}

function isErrors(value: unknown): value is AccountErrors {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
