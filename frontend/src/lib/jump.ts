import type Lenis from 'lenis'

const OFFSET = -84

export function jump(lenis: Lenis | undefined, id: string) {
  if (id === 'top') {
    if (lenis) {
      lenis.start()
      lenis.scrollTo(0, { duration: 1.05 })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    history.pushState(null, '', '#top')
    return
  }

  const el = document.getElementById(id)
  if (!el) return

  if (lenis) {
    lenis.start()
    lenis.scrollTo(el, { offset: OFFSET, duration: 1.15 })
  } else {
    const top = el.getBoundingClientRect().top + window.scrollY + OFFSET
    window.scrollTo({ top, behavior: 'smooth' })
  }
  history.pushState(null, '', `#${id}`)
}
