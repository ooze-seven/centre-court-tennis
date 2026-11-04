import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useLenis } from 'lenis/react'
import { requestHold, requestMyHolds, requestTaken, useAuth } from '../lib/auth.ts'
import { withNext } from '../lib/gate.ts'
import { prettyDate, toISO } from '../lib/days.ts'
import {
  addWeeks,
  hourLabel,
  hourRange,
  hours,
  isPast,
  pesos,
  rateName,
  sameDay,
  slotKey,
  startOfWeek,
  weekDates,
  weekLabel,
} from '../lib/schedule.ts'
import { Arrow } from './icons.tsx'
import { PassCard } from './PassCard.tsx'

type Slot = { iso: string; hour: number }

type HeldRequest = Slot & { coach: boolean; pass: string }

type Errors = Partial<Record<'name' | 'mobile', string>>

export function Schedule() {
  const now = useRef(new Date()).current
  const today = toISO(now)
  const thisWeek = startOfWeek(now)
  const [week, setWeek] = useState(thisWeek)
  const [picked, setPicked] = useState<Slot | null>(null)
  const [held, setHeld] = useState<Record<string, true>>({})
  const [passes, setPasses] = useState<Record<string, HeldRequest>>({})
  const [done, setDone] = useState<HeldRequest | null>(null)
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [coach, setCoach] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  function setPanel(node: HTMLElement | null) {
    panelRef.current = node
  }
  const nameSeeded = useRef(false)
  const lenis = useLenis()
  const { user, ready } = useAuth()
  const days = weekDates(week)
  const atThisWeek = toISO(week) <= toISO(thisWeek)

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    let lastHeight = -1
    let frames = 0
    let raf = 0
    const align = () => {
      const max = node.scrollHeight - node.clientHeight
      if (max <= 0 || (node.clientHeight !== lastHeight && frames < 8)) {
        lastHeight = node.clientHeight
        frames += 1
        raf = window.requestAnimationFrame(align)
        return
      }
      node.scrollTop = (now.getHours() / 24) * max
    }
    align()
    return () => window.cancelAnimationFrame(raf)
  }, [now])

  useEffect(() => {
    let cancel = false
    const load = () => {
      requestTaken()
        .then((slots) => {
          if (cancel) return
          const marked: Record<string, true> = {}
          for (const slot of slots) marked[slotKey(slot.date, slot.hour)] = true
          setHeld((current) => ({ ...current, ...marked }))
        })
        .catch(() => undefined)
    }
    load()
    window.addEventListener('focus', load)
    return () => {
      cancel = true
      window.removeEventListener('focus', load)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setPasses({})
      setDone(null)
      return
    }
    let cancel = false
    requestMyHolds()
      .then((holds) => {
        if (cancel) return
        const nextPasses: Record<string, HeldRequest> = {}
        const marked: Record<string, true> = {}
        for (const hold of holds) {
          const key = slotKey(hold.date, hold.hour)
          marked[key] = true
          nextPasses[key] = { iso: hold.date, hour: hold.hour, coach: hold.coach, pass: hold.pass }
        }
        setHeld((current) => ({ ...current, ...marked }))
        setPasses(nextPasses)
      })
      .catch(() => undefined)
    return () => {
      cancel = true
    }
  }, [user])

  useEffect(() => {
    if (nameSeeded.current || !user) return
    nameSeeded.current = true
    const fullName = `${user.firstName} ${user.lastName}`
    setName((current) => (current.trim() ? current : fullName))
    setMobile((current) => (current.trim() ? current : user.phone))
  }, [user])

  useEffect(() => {
    if (!picked || !ready) return
    const node = panelRef.current
    if (!node) return
    const top = node.getBoundingClientRect().top
    if (top >= 108 && top <= window.innerHeight - 180) return
    if (lenis) {
      lenis.scrollTo(node, { offset: -108, duration: 0.6 })
      return
    }
    window.scrollBy({ top: top - 108, behavior: 'smooth' })
  }, [picked, lenis, ready, user])

  function choose(slot: Slot) {
    const key = slotKey(slot.iso, slot.hour)
    const pass = passes[key]
    if (pass) {
      setDone(pass)
      setPicked(null)
      setErrors({})
      setFormError('')
      return
    }
    if (held[key]) return
    setPicked(slot)
    setDone(null)
    setErrors({})
    setFormError('')
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!picked || !user || busy) return
    const next: Errors = {}
    if (name.trim().length < 2) next.name = 'Add your name.'
    const digits = mobile.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 13) next.mobile = 'Check the mobile number.'
    setErrors(next)
    setFormError('')
    if (next.name || next.mobile) {
      document.getElementById(next.name ? 'hold-name' : 'hold-mobile')?.focus()
      return
    }
    setBusy(true)
    try {
      const result = await requestHold({ date: picked.iso, hour: picked.hour, coach })
      if (!result.ok) {
        if (result.error === 'That hour is already held.' || result.error === 'That hour is already in your request.') {
          const key = slotKey(picked.iso, picked.hour)
          setHeld((current) => ({ ...current, [key]: true }))
          const existing = passes[key]
          if (existing) setDone(existing)
          setPicked(null)
          return
        }
        setFormError(result.error)
        return
      }
      const saved = { iso: picked.iso, hour: picked.hour, coach, pass: result.hold.pass }
      setHeld((current) => ({ ...current, [slotKey(picked.iso, picked.hour)]: true }))
      setPasses((current) => ({ ...current, [slotKey(picked.iso, picked.hour)]: saved }))
      setDone(saved)
      setPicked(null)
      setName(`${user.firstName} ${user.lastName}`)
      setMobile(user.phone)
      setCoach(false)
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="board">
      <div className="board__bar">
        <button
          className="board__jump"
          type="button"
          disabled={atThisWeek}
          onClick={() => setWeek((current) => addWeeks(current, -1))}
        >
          Previous
        </button>
        <p className="board__when">{weekLabel(days)}</p>
        <div className="board__jumps">
          <button className="board__jump" type="button" onClick={() => setWeek(thisWeek)}>
            Today
          </button>
          <button className="board__jump" type="button" onClick={() => setWeek((current) => addWeeks(current, 1))}>
            Next
          </button>
        </div>
      </div>
      <ul className="board__key">
        <li>
          <i className="board__swatch board__swatch--open" /> Open
        </li>
        <li>
          <i className="board__swatch board__swatch--held" /> Held
        </li>
        <li>
          <i className="board__swatch board__swatch--shut" /> Passed
        </li>
      </ul>
      <div className="board__scroll" ref={scrollRef} data-lenis-prevent tabIndex={0}>
        <div className="board__grid">
          <div className="board__corner" />
          {days.map((date) => {
            const iso = toISO(date)
            return (
              <div key={iso} className={iso === today ? 'board__day is-today' : 'board__day'}>
                <span>{date.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                <strong>{date.getDate()}</strong>
              </div>
            )
          })}
          {hours.map((hour) => (
            <HourRow
              key={hour}
              hour={hour}
              days={days}
              today={today}
              now={now}
              held={held}
              passes={passes}
              picked={picked}
              onChoose={choose}
            />
          ))}
        </div>
      </div>
      {done && user ? (
        <PassCard
          pass={done.pass}
          name={`${user.firstName} ${user.lastName}`}
          iso={done.iso}
          hour={done.hour}
          coach={done.coach}
          onClose={() => setDone(null)}
        />
      ) : null}
      {picked && user ? (
        <form ref={setPanel} className="form board__request" noValidate onSubmit={onSubmit}>
          <p className="eyebrow">{prettyDate(picked.iso)}</p>
          <h3>{hourRange(picked.hour)}</h3>
          <p className="dek">
            {rateName(picked.hour)} · {pesos(picked.hour)} pesos an hour
          </p>
          <p className="dek">The desk holds this under the name on your gate.</p>
          <div className="field-row">
            <label className="field">
              <span>Full name</span>
              <input
                id="hold-name"
                name="name"
                autoComplete="name"
                value={name}
                readOnly
                aria-invalid={Boolean(errors.name)}
                onChange={(event) => setName(event.target.value)}
              />
              {errors.name ? <small className="err">{errors.name}</small> : null}
            </label>
            <label className="field">
              <span>Mobile</span>
              <input
                id="hold-mobile"
                name="mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={mobile}
                readOnly
                aria-invalid={Boolean(errors.mobile)}
                onChange={(event) => setMobile(event.target.value)}
              />
              {errors.mobile ? <small className="err">{errors.mobile}</small> : null}
            </label>
          </div>
          <div className="choice">
            <span id="coach-label">Do you need a coach?</span>
            <div className="seg" role="group" aria-labelledby="coach-label">
              <button type="button" aria-pressed={!coach} onClick={() => setCoach(false)}>
                No
              </button>
              <button type="button" aria-pressed={coach} onClick={() => setCoach(true)}>
                Yes
              </button>
            </div>
          </div>
          {formError ? (
            <p className="form__alert" role="alert">
              {formError}
            </p>
          ) : null}
          <button className="btn btn--lime" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Request this hour'}
            <Arrow />
          </button>
        </form>
      ) : null}
      {picked && ready && !user ? (
        <div className="board__request" ref={setPanel} aria-live="polite">
          <p className="eyebrow">{prettyDate(picked.iso)}</p>
          <h3>{hourRange(picked.hour)}</h3>
          <p className="dek">
            {rateName(picked.hour)} · {pesos(picked.hour)} pesos an hour
          </p>
          <p className="dek">Sign in with your player name before the desk can hold this hour.</p>
          <div className="gate__actions">
            <Link className="btn btn--lime" to={withNext('/sign-in', '/#desk')}>
              Sign in
              <Arrow />
            </Link>
            <Link className="btn btn--ghost" to={withNext('/sign-up', '/#desk')}>
              Take a player name
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function HourRow({
  hour,
  days,
  today,
  now,
  held,
  passes,
  picked,
  onChoose,
}: {
  hour: number
  days: Date[]
  today: string
  now: Date
  held: Record<string, true>
  passes: Record<string, HeldRequest>
  picked: Slot | null
  onChoose: (slot: Slot) => void
}) {
  return (
    <>
      <div className="board__hour" data-hour={hour}>
        {hourLabel(hour)}
      </div>
      {days.map((date) => {
        const iso = toISO(date)
        const key = slotKey(iso, hour)
        const shut = isPast(iso, hour, now)
        const taken = Boolean(held[key])
        const mine = Boolean(passes[key])
        const selected = picked?.iso === iso && picked.hour === hour
        const day = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
        const label = mine
          ? `Show the pass, ${day}, ${hourRange(hour)}`
          : taken
            ? `Held, ${day}, ${hourRange(hour)}`
            : shut
              ? `Passed, ${day}, ${hourRange(hour)}`
              : `Request ${day}, ${hourRange(hour)}, ${pesos(hour)} pesos`
        return (
          <button
            key={key}
            type="button"
            className={[
              'slot',
              taken ? 'slot--held' : shut ? 'slot--shut' : 'slot--open',
              sameDay(date, today) ? 'is-today' : '',
              selected ? 'is-picked' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={shut && !mine}
            aria-disabled={taken && !mine}
            aria-pressed={selected}
            aria-label={label}
            onClick={() => {
              if (taken && !mine) return
              onChoose({ iso, hour })
            }}
          >
            {taken ? <b>Held</b> : shut ? null : <span className="slot__plus" />}
          </button>
        )
      })}
    </>
  )
}
