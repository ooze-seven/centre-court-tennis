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

export function watchGate(onClear: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === gateKey && !event.newValue) onClear()
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

export function whenGateRejects(onReject: () => void) {
  onRejected = onReject
  return () => {
    if (onRejected === onReject) onRejected = null
  }
}

export async function requestSignIn(username: string, password: string) {
  return readAuth(await send('/api/auth/signin', { username, password }))
}

export async function requestSignUp(draft: AccountDraft) {
  return readAuth(await send('/api/auth/signup', draft))
}

export async function requestSignOut() {
  try {
    const payload = await send('/api/auth/signout', {})
    if (!isRecord(payload) || payload.ok !== true) throw new Error('The gate did not answer. Try again.')
  } finally {
    forgetGate()
  }
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

export type DeskHold = Omit<CourtHold, 'pass'> & {
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

export async function requestPass(code: string) {
  const payload = await send(`/api/admin/passes/${encodeURIComponent(code)}`)
  if (isRecord(payload) && payload.ok === true && isPassLook(payload)) return payload
  if (isRecord(payload) && payload.ok === false) {
    return { ok: false as const, error: typeof payload.error === 'string' ? payload.error : 'That pass is not on the book.' }
  }
  throw new Error('The gate did not answer. Try again.')
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

const gateKey = 'cct_session'

let onRejected: (() => void) | null = null

function apiUrl(path: string) {
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
  return `${base}${path}`
}

function gateToken() {
  try {
    const value = localStorage.getItem(gateKey)
    return value && /^[a-f0-9]{64}$/.test(value) ? value : null
  } catch {
    return null
  }
}

function rememberGate(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return
  try {
    localStorage.setItem(gateKey, token)
  } catch {
    // A private window can refuse storage. The cookie still covers a same-site gate.
  }
}

function forgetGate() {
  try {
    localStorage.removeItem(gateKey)
  } catch {
    // The stored key is already unreachable.
  }
}

async function send(path: string, body?: unknown) {
  const headers = new Headers()
  const token = gateToken()
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (body !== undefined) headers.set('content-type', 'application/json')
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('The gate did not answer. Try again.')
  }
  if (response.status === 401 && path !== '/api/auth/signin') {
    forgetGate()
    onRejected?.()
  }
  try {
    return (await response.json()) as unknown
  } catch {
    throw new Error('The gate did not answer. Try again.')
  }
}

function readAuth(payload: unknown): AuthResult {
  if (isRecord(payload) && payload.ok === true && isSessionUser(payload.user)) {
    if (typeof payload.token === 'string') rememberGate(payload.token)
    return { ok: true, user: payload.user }
  }
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
    typeof value.coach === 'boolean' &&
    typeof value.pass === 'string'
  )
}

function isPassLook(value: Record<string, unknown>): value is PassLook & { ok: true } {
  return (
    (value.gate === 'now' || value.gate === 'early' || value.gate === 'late') &&
    typeof value.firstName === 'string' &&
    typeof value.lastName === 'string' &&
    typeof value.username === 'string' &&
    typeof value.phone === 'string' &&
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
