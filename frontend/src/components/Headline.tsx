import type { ReactNode } from 'react'

export function Headline({ children }: { children: ReactNode }) {
  return (
    <h2 className="rise">
      <span className="rise__in">{children}</span>
    </h2>
  )
}
