import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../lib/auth.ts'
import { safeNext, withNext } from '../lib/gate.ts'
import { Arrow } from './icons.tsx'
import { Gate, GateWait } from './Gate.tsx'

export function SignIn() {
  const { user, ready, signIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!ready) return <GateWait />
  if (user) return <Navigate to={safeNext(next, user.role)} replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const nextErrors: { username?: string; password?: string } = {}
    if (!username.trim()) nextErrors.username = 'Add your player name.'
    if (!password) nextErrors.password = 'Add your password.'
    setErrors(nextErrors)
    setFormError('')
    if (nextErrors.username || nextErrors.password) {
      document.getElementById(nextErrors.username ? 'sign-username' : 'sign-password')?.focus()
      return
    }
    setBusy(true)
    try {
      const result = await signIn(username.trim(), password)
      if (!result.ok) {
        setFormError(result.error ?? 'That player name and password do not match.')
        document.getElementById('sign-username')?.focus()
        return
      }
      navigate(safeNext(next, result.user.role), { replace: true })
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Gate
      eyebrow="The gate"
      title="Sign in."
      dek="Players and the desk use this gate. The player name decides which side opens."
      shot={{ src: '/frames/dusk.jpg', position: '50% 55%' }}
    >
      <form className="form" autoComplete="on" noValidate aria-labelledby="gate-title" onSubmit={onSubmit}>
        <label className="field" htmlFor="sign-username">
          <span>Player name</span>
          <input
            id="sign-username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            value={username}
            aria-invalid={Boolean(errors.username)}
            onChange={(event) => setUsername(event.target.value)}
          />
          {errors.username ? <small className="err">{errors.username}</small> : null}
        </label>
        <label className="field" htmlFor="sign-password">
          <span>Password</span>
          <input
            id="sign-password"
            name="password"
            type="password"
            autoComplete="current-password"
            enterKeyHint="go"
            maxLength={128}
            value={password}
            aria-invalid={Boolean(errors.password)}
            onChange={(event) => setPassword(event.target.value)}
          />
          {errors.password ? <small className="err">{errors.password}</small> : null}
        </label>
        {formError ? (
          <p className="form__alert" role="alert">
            {formError}
          </p>
        ) : null}
        <button className="btn btn--lime" type="submit" disabled={busy}>
          {busy ? 'Checking…' : 'Sign in'}
          <Arrow />
        </button>
      </form>
      <p className="gate__swap">
        New player? <Link to={withNext('/sign-up', next)}>Take a player name</Link>
      </p>
    </Gate>
  )
}
