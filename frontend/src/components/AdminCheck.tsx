import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { requestPass, type PassLook } from '../lib/auth.ts'
import { prettyDate } from '../lib/days.ts'
import { hourRange, rateName } from '../lib/schedule.ts'
import { DeskHead } from './AdminDesk.tsx'
import { Arrow } from './icons.tsx'

const verdict = {
  now: 'This hour is theirs.',
  early: 'This hour has not started.',
  late: 'This hour has passed.',
} as const

export function AdminCheck() {
  const params = useParams()
  const code = (params.code ?? '').toLowerCase()
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const [look, setLook] = useState<{ code: string; result: PassLook } | null>(null)
  const [fault, setFault] = useState<{ code: string; message: string } | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const shown = look?.code === code ? look.result : null
  const error = fault?.code === code ? fault.message : ''

  useEffect(() => {
    if (!code) return
    let cancel = false
    requestPass(code)
      .then((result) => {
        if (cancel) return
        if (result.ok) setLook({ code, result })
        else setFault({ code, message: result.error })
      })
      .catch((caught: unknown) => {
        if (!cancel) setFault({ code, message: caught instanceof Error ? caught.message : 'Try again.' })
      })
    return () => {
      cancel = true
    }
  }, [code])

  useEffect(() => {
    if (!scanning) return
    const video = videoRef.current
    if (!video) return
    let cancel = false
    let stream: MediaStream | null = null
    let timer = 0

    async function run() {
      if (!video) return
      try {
        stream = await openCamera()
        if (cancel) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        video.srcObject = stream
        await video.play()
        const detector = openDetector()
        if (!detector) {
          stream.getTracks().forEach((track) => track.stop())
          if (!cancel) {
            setScanning(false)
            setScanError('This browser cannot scan. Type the code on the pass.')
          }
          return
        }
        timer = window.setInterval(() => {
          if (cancel || video.readyState < 2) return
          detector
            .detect(video)
            .then((codes) => {
              const raw = codes[0]?.rawValue
              if (!raw || cancel) return
              cancel = true
              window.clearInterval(timer)
              stream?.getTracks().forEach((track) => track.stop())
              setScanning(false)
              navigate(`/admin/check/${readPass(raw)}`)
            })
            .catch(() => undefined)
        }, 400)
      } catch {
        if (!cancel) setScanError('The camera stayed shut. Type the code on the pass.')
      }
    }

    void run()
    return () => {
      cancel = true
      window.clearInterval(timer)
      stream?.getTracks().forEach((track) => track.stop())
      video.srcObject = null
    }
  }, [navigate, scanning])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = readPass(draft)
    if (!next) {
      setFault({ code, message: 'Type the code on the pass.' })
      return
    }
    setDraft('')
    setScanning(false)
    navigate(`/admin/check/${next}`)
  }

  return (
    <>
      <DeskHead
        eyebrow="Scan"
        title="The pass."
        dek="Scan the code the player shows. The book says whether this hour is theirs."
      />
      <form className="form admin__scan" onSubmit={onSubmit}>
        {scanning ? <video ref={videoRef} muted playsInline /> : null}
        <div className="gate__actions">
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => {
              setScanError('')
              setScanning((value) => !value)
            }}
          >
            {scanning ? 'Stop the camera' : 'Scan the pass'}
          </button>
        </div>
        {scanError ? (
          <p className="form__alert" role="alert">
            {scanError}
          </p>
        ) : null}
        <label className="field" htmlFor="pass-code">
          <span>Code on the pass</span>
          <input
            id="pass-code"
            name="code"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button className="btn btn--lime" type="submit">
          Check the pass
          <Arrow />
        </button>
      </form>
      {code && !shown && !error ? <p className="dek">Checking the pass…</p> : null}
      {error ? (
        <p className="form__alert" role="alert">
          {error}
        </p>
      ) : null}
      {shown ? <PassResult result={shown} /> : null}
    </>
  )
}

function PassResult({ result }: { result: PassLook }) {
  return (
    <section className="admin__verdict" data-gate={result.gate}>
      <p className="eyebrow">{result.gate === 'now' ? 'On the book' : 'On the book, wrong hour'}</p>
      <h2>{verdict[result.gate]}</h2>
      <dl className="facts">
        <div>
          <dt>Player</dt>
          <dd>
            {result.firstName} {result.lastName}
          </dd>
        </div>
        <div>
          <dt>Player name</dt>
          <dd>{result.username}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{result.phone}</dd>
        </div>
        <div>
          <dt>Hour</dt>
          <dd>
            {prettyDate(result.date)} · {hourRange(result.hour)}
          </dd>
        </div>
        <div>
          <dt>Rate</dt>
          <dd>
            {rateName(result.hour)}
            {result.coach ? ' · Coach' : ''}
          </dd>
        </div>
      </dl>
    </section>
  )
}

function readPass(value: string) {
  const text = value.trim()
  if (!text) return ''
  try {
    const url = new URL(text)
    return (url.pathname.split('/').filter(Boolean).pop() ?? '').toLowerCase()
  } catch {
    return text.toLowerCase()
  }
}

async function openCamera() {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
  } catch {
    return navigator.mediaDevices.getUserMedia({ video: true })
  }
}

function openDetector() {
  const host = window as Window & {
    BarcodeDetector?: new (options: { formats: string[] }) => {
      detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]>
    }
  }
  if (!host.BarcodeDetector) return null
  return new host.BarcodeDetector({ formats: ['qr_code'] })
}
