import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLenis } from 'lenis/react'
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

type Slot = { iso: string; hour: number }

type HeldRequest = Slot & { coach: boolean }

type Errors = Partial<Record<'name' | 'mobile', string>>

export function Schedule() {
  const now = useRef(new Date()).current
  const today = toISO(now)
  const thisWeek = startOfWeek(now)
  const [week, setWeek] = useState(thisWeek)
  const [picked, setPicked] = useState<Slot | null>(null)
  const [held, setHeld] = useState<Record<string, true>>({})
  const [done, setDone] = useState<HeldRequest | null>(null)
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [coach, setCoach] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const lenis = useLenis()
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
    if (!picked) return
    const node = formRef.current
    if (!node) return
    const top = node.getBoundingClientRect().top
    if (top >= 108 && top <= window.innerHeight - 180) return
    if (lenis) {
      lenis.scrollTo(node, { offset: -108, duration: 0.6 })
      return
    }
    window.scrollBy({ top: top - 108, behavior: 'smooth' })
  }, [picked, lenis])

  function choose(slot: Slot) {
    setPicked(slot)
    setDone(null)
    setErrors({})
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!picked) return
    const next: Errors = {}
    if (name.trim().length < 2) next.name = 'Add your name.'
    const digits = mobile.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 13) next.mobile = 'Check the mobile number.'
    setErrors(next)
    if (next.name || next.mobile) {
      document.getElementById(next.name ? 'hold-name' : 'hold-mobile')?.focus()
      return
    }
    setHeld((current) => ({ ...current, [slotKey(picked.iso, picked.hour)]: true }))
    setDone({ ...picked, coach })
    setPicked(null)
    setName('')
    setMobile('')
    setCoach(false)
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
              picked={picked}
              onChoose={choose}
            />
          ))}
        </div>
      </div>
      {done ? (
        <div className="board__request" aria-live="polite">
          <p className="eyebrow">Request received</p>
          <h3>{prettyDate(done.iso)}</h3>
          <p className="dek">
            {hourRange(done.hour)} · {rateName(done.hour)} · {pesos(done.hour)} pesos
            {done.coach ? ' · Coach' : ''}
          </p>
          <p className="dek">The desk will confirm before anyone walks on. Arrive 10 minutes early.</p>
          <button className="btn btn--lime" type="button" onClick={() => setDone(null)}>
            Hold another hour
            <Arrow />
          </button>
        </div>
      ) : null}
      {picked ? (
        <form ref={formRef} className="form board__request" noValidate onSubmit={onSubmit}>
          <p className="eyebrow">{prettyDate(picked.iso)}</p>
          <h3>
            {hourRange(picked.hour)}
          </h3>
          <p className="dek">
            {rateName(picked.hour)} · {pesos(picked.hour)} pesos an hour
          </p>
          <div className="field-row">
            <label className="field">
              <span>Full name</span>
              <input
                id="hold-name"
                name="name"
                autoComplete="name"
                value={name}
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
          <button className="btn btn--lime" type="submit">
            Request this hour
            <Arrow />
          </button>
        </form>
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
  picked,
  onChoose,
}: {
  hour: number
  days: Date[]
  today: string
  now: Date
  held: Record<string, true>
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
        const selected = picked?.iso === iso && picked.hour === hour
        const day = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
        const label = taken
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
            disabled={shut || taken}
            aria-pressed={selected}
            aria-label={label}
            onClick={() => onChoose({ iso, hour })}
          >
            {taken ? (
              <>
                <b>
                  {hour}–{hour === 23 ? 24 : hour + 1}
                </b>
                <small>Held</small>
              </>
            ) : shut ? null : (
              <span className="slot__plus" />
            )}
          </button>
        )
      })}
    </>
  )
}
