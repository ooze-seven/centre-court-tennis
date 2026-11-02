import { Link } from 'react-router'
import { Anchor } from './Anchor.tsx'

export function Brand({ variant = 'nav', home = false }: { variant?: 'nav' | 'stack'; home?: boolean }) {
  if (variant === 'stack') {
    return (
      <div className="brand brand--stack">
        <Mark />
        <Type lines />
      </div>
    )
  }
  if (home) {
    return (
      <Link to="/" className="brand">
        <Mark />
        <Type />
      </Link>
    )
  }
  return (
    <Anchor href="#top" className="brand">
      <Mark />
      <Type />
    </Anchor>
  )
}

function Mark() {
  return (
    <span className="brand__seal">
      <img src="/frames/mark-c.svg" alt="" />
    </span>
  )
}

function Type({ lines = false }: { lines?: boolean }) {
  return (
    <span className="brand__type">
      <span className="brand__name">Centrecourt</span>
      <span className="brand__sub">
        {lines ? <i /> : null}
        Tennis
        {lines ? <i /> : null}
      </span>
    </span>
  )
}
