import { Anchor } from './Anchor.tsx'

export function Brand({ variant = 'nav' }: { variant?: 'nav' | 'stack' }) {
  const stacked = variant === 'stack'
  return stacked ? (
    <div className="brand brand--stack">
      <Mark />
      <Type lines />
    </div>
  ) : (
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
