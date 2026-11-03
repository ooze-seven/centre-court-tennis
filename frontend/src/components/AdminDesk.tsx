import { createContext, useContext, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { validateAccount, type AccountDraft, type AccountErrors } from '../lib/account.ts'
import {
  requestBook,
  requestDeskHolds,
  requestStaff,
  useAuth,
  type DeskHold,
  type ListedAccount,
  type SessionUser,
} from '../lib/auth.ts'
import { addDaysISO, prettyDate } from '../lib/days.ts'
import { DAY_END, DAY_START, hourRange } from '../lib/schedule.ts'
import { AccountForm } from './AccountForm.tsx'
import { Brand } from './Brand.tsx'

type Book = { players: ListedAccount[]; staff: ListedAccount[] }

type DeskState = {
  user: SessionUser
  book: Book | null
  holds: DeskHold[] | null
  addStaff: (person: ListedAccount) => void
}

const DeskContext = createContext<DeskState | null>(null)

function useDesk() {
  const value = useContext(DeskContext)
  if (!value) throw new Error('AdminDesk is missing')
  return value
}

export function AdminDesk() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const narrow = useNarrow()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const open = narrow && openPath === pathname
  const [book, setBook] = useState<Book | null>(null)
  const [holds, setHolds] = useState<DeskHold[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [outError, setOutError] = useState('')
  const [outBusy, setOutBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancel = false
    requestBook()
      .then((next) => {
        if (!cancel) setBook(next)
      })
      .catch((caught: unknown) => {
        if (!cancel) remember(setLoadError, caught instanceof Error ? caught.message : 'The book did not open.')
      })
    requestDeskHolds()
      .then((next) => {
        if (!cancel) setHolds(next)
      })
      .catch((caught: unknown) => {
        if (!cancel) remember(setLoadError, caught instanceof Error ? caught.message : 'The hours did not open.')
      })
    return () => {
      cancel = true
    }
  }, [user])

  useEffect(() => {
    if (!open) return
    document.documentElement.classList.add('lock')
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenPath(null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.classList.remove('lock')
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  async function out() {
    if (outBusy) return
    setOutBusy(true)
    setOutError('')
    try {
      navigate('/')
      await signOut()
    } catch (caught) {
      setOutError(caught instanceof Error ? caught.message : 'Try again.')
      setOutBusy(false)
    }
  }

  function addStaff(person: ListedAccount) {
    setBook((current) => ({
      players: current?.players ?? [],
      staff: [person, ...(current?.staff ?? []).filter((item) => item.id !== person.id)],
    }))
  }

  const items: { to: string; label: string; end?: boolean; count?: number }[] = [
    { to: '/admin', label: 'Overview', end: true },
    { to: '/admin/hours', label: 'Hours', count: holds?.length },
    { to: '/admin/players', label: 'Players', count: book?.players.length },
    { to: '/admin/desk', label: 'Desk logins', count: book?.staff.length },
  ]

  return (
    <DeskContext.Provider value={{ user, book, holds, addStaff }}>
      <div className={open ? 'admin is-open' : 'admin'}>
        <a className="skip" href="#admin-main">
          Skip to the board
        </a>
        <aside id="desk-rail" className="admin__rail" inert={narrow && !open}>
          <div className="admin__brand">
            <Brand home />
            <p className="eyebrow">The desk</p>
          </div>
          <nav className="admin__nav" aria-label="Desk">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
                {item.count === undefined ? null : <span className="admin__badge">{item.count}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="admin__who">
            <p className="admin__person">
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <span>{user.username}</span>
            </p>
            <div className="admin__links">
              <Link to="/">The court</Link>
              <Link to="/account">Your login</Link>
              <button type="button" onClick={out} disabled={outBusy}>
                {outBusy ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
            {outError ? (
              <p className="form__alert" role="alert">
                {outError}
              </p>
            ) : null}
          </div>
        </aside>
        {open ? <div className="admin__shade" onClick={() => setOpenPath(null)} /> : null}
        <div className="admin__body">
          <div className="admin__bar">
            <button
              className="btn btn--ghost admin__menu"
              type="button"
              aria-expanded={open}
              aria-controls="desk-rail"
              onClick={() => setOpenPath(open ? null : pathname)}
            >
              {open ? 'Close' : 'Menu'}
            </button>
            <span className="admin__bar-name">The desk</span>
          </div>
          <main className="admin__stage" id="admin-main" tabIndex={-1}>
            {loadError ? (
              <p className="form__alert" role="alert">
                {loadError}
              </p>
            ) : null}
            <Outlet />
          </main>
        </div>
      </div>
    </DeskContext.Provider>
  )
}

export function AdminOverview() {
  const { holds, book } = useDesk()
  const waiting = holds === null ? null : holds.length
  const coaches = holds === null ? null : holds.filter((hold) => hold.coach).length
  const players = book === null ? null : book.players.length
  const staff = book === null ? null : book.staff.length
  const upcoming = holds === null ? null : bySlot(holds).slice(0, 4)
  const newest = book === null ? null : book.players.slice(0, 4)

  return (
    <>
      <DeskHead
        eyebrow="Overview"
        title="The board."
        dek="What is waiting on the court, who has a player name, and who can open this side."
      />
      <div className="admin__stats">
        <Stat to="/admin/hours" value={waiting} label="Hours waiting" />
        <Stat to="/admin/hours" value={coaches} label="With a coach" />
        <Stat to="/admin/players" value={players} label="Players" />
        <Stat to="/admin/desk" value={staff} label="Desk logins" />
      </div>
      <section className="admin__panel">
        <div className="admin__panel-head">
          <h2>Next seven days</h2>
        </div>
        {holds === null ? <p className="dek">Opening the hours…</p> : <WeekChart holds={holds} />}
      </section>
      <div className="admin__cols">
        <section className="admin__panel">
          <div className="admin__panel-head">
            <h2>Next on the board</h2>
            <Link className="admin__more" to="/admin/hours">
              All hours
            </Link>
          </div>
          {upcoming === null ? (
            <p className="dek">Opening the hours…</p>
          ) : (
            <HoursTable holds={upcoming} empty="No hour is waiting. A player has to be signed in before the desk can take one." />
          )}
        </section>
        <section className="admin__panel">
          <div className="admin__panel-head">
            <h2>Newest players</h2>
            <Link className="admin__more" to="/admin/players">
              All players
            </Link>
          </div>
          {newest === null ? (
            <p className="dek">Opening the book…</p>
          ) : (
            <PeopleTable people={newest} compact empty="No player name on the book yet." />
          )}
        </section>
      </div>
    </>
  )
}

export function AdminHours() {
  const { holds } = useDesk()
  return (
    <>
      <DeskHead
        eyebrow="Hours"
        title="Hours."
        dek="A request is not a confirmed booking. The desk still confirms the hour."
      />
      {holds === null ? (
        <p className="dek">Opening the hours…</p>
      ) : (
        <HoursTable holds={bySlot(holds)} empty="No hour is waiting. A player has to be signed in before the desk can take one." />
      )}
    </>
  )
}

export function AdminPlayers() {
  const { book } = useDesk()
  return (
    <>
      <DeskHead eyebrow="Players" title="Players." dek="People who took a player name. They sign in on the court." />
      {book === null ? <p className="dek">Opening the book…</p> : <PeopleTable people={book.players} empty="No player name on the book yet." />}
    </>
  )
}

export function AdminLogins() {
  const { user, book, addStaff } = useDesk()
  const [errors, setErrors] = useState<AccountErrors>({})
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)

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
      addStaff(result.user)
      setNotice(`${result.user.username} can sign in on the same gate.`)
      setTick((value) => value + 1)
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DeskHead
        eyebrow="Desk"
        title="Logins."
        dek="These names open this side. A player cannot sign up as the desk."
      />
      <div className="admin__work">
        <section className="admin__panel">
          <div className="admin__panel-head">
            <h2>On this side</h2>
          </div>
          {book === null ? (
            <p className="dek">Opening the book…</p>
          ) : (
            <PeopleTable people={book.staff} you={user.id} empty="No desk login yet." />
          )}
        </section>
        <section className="admin__card">
          <h2 id="desk-form-title">New desk login</h2>
          <p className="dek">Same fields as a player. This one opens the desk, and only from this side. You stay signed in.</p>
          <AccountForm
            key={tick}
            idPrefix="staff"
            staff
            labelledBy="desk-form-title"
            submitLabel="Save the login"
            busyLabel="Saving…"
            busy={busy}
            errors={errors}
            formError={formError}
            notice={notice}
            onSave={save}
          />
        </section>
      </div>
    </>
  )
}

export function DeskHead({ eyebrow, title, dek }: { eyebrow: string; title: string; dek: string }) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title.replace(/\.$/, '')} — Centrecourt Tennis`
    return () => {
      document.title = previous
    }
  }, [title])

  return (
    <header className="admin__head">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="dek">{dek}</p>
    </header>
  )
}

function Stat({ to, value, label }: { to: string; value: number | null; label: string }) {
  return (
    <Link className="admin__stat" to={to}>
      <strong>{value === null ? '—' : value}</strong>
      <span>{label}</span>
    </Link>
  )
}

function WeekChart({ holds }: { holds: DeskHold[] }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const iso = addDaysISO(index)
    const [year, month, day] = iso.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return {
      iso,
      count: holds.filter((hold) => hold.date === iso).length,
      name: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      day: date.getDate(),
      today: index === 0,
    }
  })
  const max = Math.max(1, ...days.map((day) => day.count))
  const daytime = holds.filter((hold) => hold.hour >= DAY_START && hold.hour < DAY_END).length
  const evening = holds.length - daytime

  return (
    <div className="admin__chart">
      <div className="admin__meter-row">
        <span>
          Daytime <strong>{daytime}</strong>
        </span>
        <span>
          Evening and lights <strong>{evening}</strong>
        </span>
      </div>
      <div className="admin__meter" aria-hidden="true">
        {holds.length === 0 ? (
          <span />
        ) : (
          <>
            <span style={{ width: `${(daytime / holds.length) * 100}%` }} />
            <span className="is-night" style={{ width: `${(evening / holds.length) * 100}%` }} />
          </>
        )}
      </div>
      <ul className="admin__week" aria-label="Hours waiting over the next seven days">
        {days.map((day) => (
          <li key={day.iso} className={day.today ? 'is-today' : undefined}>
            <span
              className={day.count > 0 ? 'admin__level is-on' : 'admin__level'}
              style={{ height: `${day.count === 0 ? 4 : Math.round((day.count / max) * 108)}px` }}
            />
            <span className="admin__tally">{day.count}</span>
            <span className="admin__dow">{day.name}</span>
            <span className="admin__date">{day.day}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HoursTable({ holds, empty }: { holds: DeskHold[]; empty: string }) {
  if (holds.length === 0) return <p className="dek">{empty}</p>
  return (
    <div className="admin__scroll">
      <table className="admin__table">
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Player</th>
            <th scope="col">Phone</th>
            <th scope="col">Coach</th>
            <th scope="col">Asked</th>
          </tr>
        </thead>
        <tbody>
          {holds.map((hold) => (
            <tr key={hold.id}>
              <td>
                <span className="admin__cell">
                  <strong>{prettyDate(hold.date)}</strong>
                  <span>{hourRange(hold.hour)}</span>
                </span>
              </td>
              <td>
                <span className="admin__cell">
                  <strong>
                    {hold.firstName} {hold.lastName}
                  </strong>
                  <span className="admin__handle">{hold.username}</span>
                </span>
              </td>
              <td>{hold.phone}</td>
              <td>{hold.coach ? 'Yes' : 'No'}</td>
              <td>{asked(hold.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PeopleTable({
  people,
  empty,
  you,
  compact = false,
}: {
  people: ListedAccount[]
  empty: string
  you?: string
  compact?: boolean
}) {
  if (people.length === 0) return <p className="dek">{empty}</p>
  return (
    <div className="admin__scroll">
      <table className="admin__table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Phone</th>
            {compact ? null : (
              <>
                <th scope="col">Email</th>
                <th scope="col">Joined</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id}>
              <td>
                <span className="admin__cell">
                  <strong>
                    {person.firstName} {person.lastName}
                  </strong>
                  <span className="admin__meta">
                    <span className="admin__handle">{person.username}</span>
                    {person.id === you ? <em className="admin__tag">This login</em> : null}
                  </span>
                </span>
              </td>
              <td>{person.phone}</td>
              {compact ? null : (
                <>
                  <td>{person.email}</td>
                  <td>{joined(person.createdAt)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function remember(set: (update: (current: string) => string) => void, message: string) {
  set((current) => (current && current !== message ? `${current} ${message}` : message))
}

function bySlot(holds: DeskHold[]) {
  return [...holds].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    if (a.hour !== b.hour) return a.hour - b.hour
    return a.createdAt < b.createdAt ? -1 : 1
  })
}

function joined(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function asked(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 959px)').matches)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 959px)')
    const onChange = () => setNarrow(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return narrow
}
