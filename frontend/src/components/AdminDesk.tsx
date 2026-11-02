import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { validateAccount, type AccountDraft, type AccountErrors } from '../lib/account.ts'
import { requestBook, requestDeskHolds, requestStaff, useAuth, type DeskHold, type ListedAccount } from '../lib/auth.ts'
import { prettyDate } from '../lib/days.ts'
import { hourRange } from '../lib/schedule.ts'
import { AccountForm } from './AccountForm.tsx'
import { Gate } from './Gate.tsx'

export function AdminDesk() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [book, setBook] = useState<{ players: ListedAccount[]; staff: ListedAccount[] } | null>(null)
  const [holds, setHolds] = useState<DeskHold[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState<AccountErrors>({})
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [outBusy, setOutBusy] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancel = false
    requestBook()
      .then((next) => {
        if (!cancel) setBook(next)
      })
      .catch((caught: unknown) => {
        if (!cancel) setLoadError(caught instanceof Error ? caught.message : 'The book did not open.')
      })
    requestDeskHolds()
      .then((next) => {
        if (!cancel) setHolds(next)
      })
      .catch((caught: unknown) => {
        if (!cancel) setLoadError(caught instanceof Error ? caught.message : 'The book did not open.')
      })
    return () => {
      cancel = true
    }
  }, [])

  if (!user) return null

  async function out() {
    if (outBusy) return
    setOutBusy(true)
    try {
      navigate('/')
      await signOut()
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Try again.')
      setOutBusy(false)
    }
  }

  async function save(draft: AccountDraft) {
    const local = validateAccount(draft)
    if (Object.keys(local).length > 0) {
      setErrors(local)
      setFormError('')
      setNotice('')
      return
    }
    setBusy(true)
    setErrors({})
    setFormError('')
    setNotice('')
    try {
      const result = await requestStaff(draft)
      if (!result.ok) {
        setErrors(result.errors ?? {})
        setFormError(result.error ?? '')
        return
      }
      setBook((current) =>
        current
          ? { ...current, staff: [result.user, ...current.staff.filter((item) => item.id !== result.user.id)] }
          : { players: [], staff: [result.user] },
      )
      setNotice(`${result.user.username} can sign in on the same gate.`)
      setTick((value) => value + 1)
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Gate
      eyebrow="The desk"
      title="The book."
      dek="Players who took a player name, and the logins that open this side. A player cannot sign up as the desk."
      shot={{ src: '/frames/racket.jpg', position: '50% 38%' }}
    >
      <div className="gate__actions">
        <Link className="btn btn--ghost" to="/account">
          Your login
        </Link>
        <button className="btn btn--ghost" type="button" onClick={out} disabled={outBusy}>
          {outBusy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
      {loadError ? (
        <p className="form__alert" role="alert">
          {loadError}
        </p>
      ) : null}
      {holds ? (
        <section>
          <p className="eyebrow">Hours</p>
          {holds.length === 0 ? (
            <p className="dek">No hour is waiting. A player has to be signed in before the desk can take one.</p>
          ) : (
            <ul className="book">
              {holds.map((hold) => (
                <li key={hold.id}>
                  <strong>
                    {prettyDate(hold.date)} · {hourRange(hold.hour)}
                  </strong>
                  <span>
                    {hold.firstName} {hold.lastName}
                  </span>
                  <span className="book__user">{hold.username}</span>
                  <span>{hold.phone}</span>
                  {hold.coach ? <span>Coach</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      {book ? (
        <>
          <section>
            <p className="eyebrow">Players</p>
            <People people={book.players} empty="No player name on the book yet." />
          </section>
          <section>
            <p className="eyebrow">Desk</p>
            <People people={book.staff} empty="No desk login yet." you={user.id} />
          </section>
        </>
      ) : loadError ? null : (
        <p className="gate__wait">Opening the book…</p>
      )}
      <div className="gate__split">
        <p className="eyebrow">New desk login</p>
        <p className="dek">Same fields as a player. This one opens the desk, and only from this side.</p>
        <AccountForm
          key={tick}
          idPrefix="staff"
          staff
          submitLabel="Save the login"
          busyLabel="Saving…"
          busy={busy}
          errors={errors}
          formError={formError}
          notice={notice}
          onSave={save}
        />
      </div>
    </Gate>
  )
}

function People({ people, empty, you }: { people: ListedAccount[]; empty: string; you?: string }) {
  if (people.length === 0) return <p className="dek">{empty}</p>
  return (
    <ul className="book">
      {people.map((person) => (
        <li key={person.id}>
          <strong>
            {person.firstName} {person.lastName}
          </strong>
          <span className="book__user">{person.username}</span>
          {person.id === you ? <em className="book__tag">This login</em> : null}
          <span>{person.phone}</span>
          <span>{person.email}</span>
          <span>Joined {joined(person.createdAt)}</span>
        </li>
      ))}
    </ul>
  )
}

function joined(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
