import type { MouseEvent, ReactNode } from 'react'
import { useLenis } from 'lenis/react'
import { jump } from '../lib/jump.ts'

export function Anchor({
  href,
  className,
  children,
  onNavigate,
}: {
  href: string
  className?: string
  children: ReactNode
  onNavigate?: () => void
}) {
  const lenis = useLenis()

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    onNavigate?.()
    const id = href.replace(/^#/, '')
    window.setTimeout(() => jump(lenis, id), onNavigate ? 40 : 0)
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  )
}
