import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import type { Role } from '../lib/auth.ts'
import { useAuth } from '../lib/auth.ts'
import { Gate, GateWait } from './Gate.tsx'

export function RequireAuth({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <GateWait />
  if (!user) return <Navigate to={`/sign-in?next=${encodeURIComponent(location.pathname)}`} replace />
  if (role === 'admin' && user.role !== 'admin') return <DeskOnly />
  return children
}

function DeskOnly() {
  return (
    <Gate
      eyebrow="The desk"
      title="Desk only."
      dek="This side opens for a desk login. A player account stays on the court."
      shot={{ src: '/frames/ridge.jpg', position: '50% 45%' }}
    >
      <div className="gate__actions">
        <Link className="btn btn--lime" to="/account">
          Your account
        </Link>
        <Link className="btn btn--ghost" to="/">
          Back to the court
        </Link>
      </div>
    </Gate>
  )
}
