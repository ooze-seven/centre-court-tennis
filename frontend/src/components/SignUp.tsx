import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { validateAccount, type AccountDraft, type AccountErrors } from '../lib/account.ts'
import { useAuth } from '../lib/auth.ts'
import { safeNext, withNext } from '../lib/gate.ts'
import { AccountForm } from './AccountForm.tsx'
import { Gate, GateWait } from './Gate.tsx'

export function SignUp() {
  const { user, ready, signUp } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const [errors, setErrors] = useState<AccountErrors>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!ready) return <GateWait />
  if (user) return <Navigate to={safeNext(next, user.role)} replace />

  async function save(draft: AccountDraft) {
    const local = validateAccount(draft)
    if (Object.keys(local).length > 0) {
      setErrors(local)
      setFormError('')
      return
    }
    setBusy(true)
    setErrors({})
    setFormError('')
    try {
      const result = await signUp(draft)
      if (!result.ok) {
        setErrors(result.errors ?? {})
        setFormError(result.error ?? '')
        return
      }
      navigate(safeNext(next, 'client'), { replace: true })
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Gate
      eyebrow="New player"
      title="Join the book."
      dek="A player name for the gate, plus your name, phone, and email. No code is sent. You can sign in as soon as this is saved."
      shot={{ src: '/frames/sky.jpg', position: '50% 62%' }}
    >
      <AccountForm
        idPrefix="join"
        submitLabel="Create the login"
        busyLabel="Saving…"
        busy={busy}
        errors={errors}
        formError={formError}
        onSave={save}
      />
      <p className="gate__swap">
        Already on the book? <Link to={withNext('/sign-in', next)}>Sign in</Link>
      </p>
    </Gate>
  )
}
