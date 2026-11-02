import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Brand } from './Brand.tsx'

type Shot = {
  src: string
  position: string
}

export function Gate({
  eyebrow,
  title,
  dek,
  shot,
  name = false,
  children,
}: {
  eyebrow: string
  title: string
  dek: string
  shot: Shot
  name?: boolean
  children: ReactNode
}) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} — Centrecourt Tennis`
    return () => {
      document.title = previous
    }
  }, [title])

  return (
    <div className="gate">
      <a className="skip" href="#gate-form">
        Skip to the form
      </a>
      <header className="gate__bar">
        <Brand home />
        <Link className="gate__back" to="/">
          The court
        </Link>
      </header>
      <main className="gate__layout">
        <div className="gate__photo">
          <img src={shot.src} alt="" style={{ objectPosition: shot.position }} />
          <div className="gate__copy">
            <p className="eyebrow">{eyebrow}</p>
            <h1 id="gate-title" className={name ? 'rise gate__name' : 'rise'}>
              <span className="rise__in">{title}</span>
            </h1>
            <p className="dek">{dek}</p>
          </div>
        </div>
        <div className="gate__panel">
          <div className="gate__sheet" id="gate-form" tabIndex={-1}>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export function GateWait() {
  return (
    <div className="gate gate--wait">
      <p className="gate__wait">Checking the gate…</p>
    </div>
  )
}
