import { useEffect, useId, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { useLenis } from 'lenis/react'
import { prettyDate } from '../lib/days.ts'
import { hourRange, pesos, rateName } from '../lib/schedule.ts'
import { Arrow } from './icons.tsx'

export function PassCard({
  pass,
  name,
  iso,
  hour,
  coach,
  onClose,
}: {
  pass: string
  name: string
  iso: string
  hour: number
  coach: boolean
  onClose: () => void
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const close = useRef(onClose)
  const lenis = useLenis()
  const [src, setSrc] = useState('')
  close.current = onClose

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('lock')
    lenis?.stop()
    return () => {
      document.documentElement.classList.remove('lock')
      lenis?.start()
    }
  }, [lenis])

  useEffect(() => {
    let cancel = false
    const target = `${window.location.origin}/admin/check/${pass}`
    QRCode.toDataURL(target, {
      margin: 2,
      width: 360,
      errorCorrectionLevel: 'M',
      color: { dark: '#12281c', light: '#f6f7f2' },
    })
      .then((url) => {
        if (!cancel) setSrc(url)
      })
      .catch(() => {
        if (!cancel) setSrc('')
      })
    return () => {
      cancel = true
    }
  }, [pass])

  return (
    <dialog
      ref={dialogRef}
      className="pass-card"
      aria-labelledby={titleId}
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault()
        close.current()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) close.current()
      }}
    >
      <div className="pass-card__apron" />
      <div className="pass-card__body">
        <header className="pass-card__top">
          <img src="/frames/mark-c.svg" alt="" width={36} height={36} />
          <div>
            <p className="eyebrow">Player pass</p>
            <p className="pass-card__brand">Centrecourt</p>
          </div>
        </header>
        <h2 id={titleId} tabIndex={-1} autoFocus>
          {name}
        </h2>
        <figure className="pass-card__qr">
          {src ? <img src={src} alt="" width={280} height={280} /> : null}
          <figcaption>
            Show this at the court. The desk scans it against the book.
            <span className="pass-card__code">{pass}</span>
          </figcaption>
        </figure>
        <dl className="pass-card__facts">
          <div>
            <dt>Day</dt>
            <dd>{prettyDate(iso)}</dd>
          </div>
          <div>
            <dt>Hour</dt>
            <dd>{hourRange(hour)}</dd>
          </div>
          <div>
            <dt>Rate</dt>
            <dd>
              {rateName(hour)} · {pesos(hour)} pesos{coach ? ' · Coach' : ''}
            </dd>
          </div>
        </dl>
        <p className="dek">The desk will confirm before anyone walks on. Arrive 10 minutes early.</p>
        <button className="btn btn--lime" type="button" onClick={() => close.current()}>
          Hold another hour
          <Arrow />
        </button>
      </div>
    </dialog>
  )
}
