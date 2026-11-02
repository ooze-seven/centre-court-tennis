import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../lib/auth.ts'
import { Gate } from './Gate.tsx'

export function Account() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!user) return null
  const desk = user.role === 'admin'

  async function out() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      navigate('/')
      await signOut()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Try again.')
      setBusy(false)
    }
  }

  return (
    <Gate
      eyebrow={desk ? 'Desk login' : 'Player'}
      title={`${user.firstName} ${user.lastName}`}
      dek={
        desk
          ? 'This login opens the desk. Players use the same gate.'
          : 'This is the name on the gate. A court still waits for the desk to confirm.'
      }
      shot={{ src: '/frames/sign.jpg', position: '50% 36%' }}
      name
    >
      <dl className="facts">
        <div>
          <dt>Player name</dt>
          <dd>{user.username}</dd>
        </div>
        <div>
          <dt>Phone number</dt>
          <dd>{user.phone}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Side</dt>
          <dd>{desk ? 'Desk' : 'Player'}</dd>
        </div>
      </dl>
      {error ? (
        <p className="form__alert" role="alert">
          {error}
        </p>
      ) : null}
      <div className="gate__actions">
        {desk ? (
          <Link className="btn btn--lime" to="/admin">
            Open the book
          </Link>
        ) : (
          <Link className="btn btn--lime" to="/#desk">
            Request a court
          </Link>
        )}
        <button className="btn btn--ghost" type="button" onClick={out} disabled={busy}>
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </Gate>
  )
}
