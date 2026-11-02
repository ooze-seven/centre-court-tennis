import type { Role } from './auth.ts'

export function safeNext(raw: string | null, role: Role) {
  const fallback = role === 'admin' ? '/admin' : '/account'
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || raw.includes('://')) return fallback
  if (raw.startsWith('/sign-in') || raw.startsWith('/sign-up')) return fallback
  if ((raw === '/admin' || raw.startsWith('/admin/')) && role !== 'admin') return '/account'
  return raw
}

export function withNext(path: '/sign-in' | '/sign-up', next: string | null) {
  if (!next) return path
  return `${path}?next=${encodeURIComponent(next)}`
}
