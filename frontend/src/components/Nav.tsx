import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useLenis } from 'lenis/react'
import { Link } from 'react-router'
import { useAuth } from '../lib/auth.ts'
import { Anchor } from './Anchor.tsx'
import { Arrow } from './icons.tsx'
import { Brand } from './Brand.tsx'

const links = [
  { href: '#grounds', label: 'Grounds', index: '01' },
  { href: '#markings', label: 'Court', index: '02' },
  { href: '#frames', label: 'Frames', index: '03' },
  { href: '#desk', label: 'Book', index: '04' },
]

export function Nav() {
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  const [outError, setOutError] = useState('')
  const burgerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const lenis = useLenis()
  const { scrollY, scrollYProgress } = useScroll()
  const { user, ready, signOut } = useAuth()

  useMotionValueEvent(scrollY, 'change', (value) => {
    setSolid((prev) => {
      const next = value > 12
      return prev === next ? prev : next
    })
  })

  useEffect(() => {
    if (!open) return
    const main = document.getElementById('top')
    const foot = document.querySelector('footer')
    document.documentElement.classList.add('lock')
    lenis?.stop()
    main?.setAttribute('inert', '')
    foot?.setAttribute('inert', '')
    return () => {
      document.documentElement.classList.remove('lock')
      lenis?.start()
      main?.removeAttribute('inert')
      foot?.removeAttribute('inert')
    }
  }, [open, lenis])

  useEffect(() => {
    if (!open) return
    const root = menuRef.current
    const nodes = root ? [...root.querySelectorAll<HTMLElement>('a, button')] : []
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    first?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        burgerRef.current?.focus()
      }
      if (event.key !== 'Tab' || nodes.length === 0) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    function land() {
      const id = window.location.hash.replace(/^#/, '')
      if (!id) return
      if (id === 'top') {
        if (!lenis) return
        lenis.start()
        lenis.scrollTo(0, { duration: 0.8, force: true })
        return
      }
      const el = document.getElementById(id)
      if (!el) return
      if (lenis) {
        lenis.resize()
        lenis.start()
        lenis.scrollTo(el, { offset: -84, duration: 0.85, force: true })
        return
      }
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 84)
    }

    const timer = window.setTimeout(land, 60)
    window.addEventListener('hashchange', land)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('hashchange', land)
    }
  }, [lenis])

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 960) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function closeMenu() {
    setOpen(false)
  }

  async function leave() {
    setOutError('')
    try {
      await signOut()
      setOpen(false)
    } catch (caught) {
      setOutError(caught instanceof Error ? caught.message : 'Try again.')
    }
  }

  return (
    <header className={solid || open ? 'nav is-solid' : 'nav'} data-open={open ? 'true' : 'false'}>
      <div className={`nav__inner ${open ? 'is-open' : ''}`}>
        <Brand />
        <nav className="nav__links" aria-label="Sections">
          {links.map((link) => (
            <Anchor key={link.href} href={link.href}>
              {link.label}
            </Anchor>
          ))}
        </nav>
        <div className="nav__end">
          <div className="nav__session">{ready ? <SessionLinks user={user} /> : null}</div>
          <Anchor href="#desk" className="btn btn--lime btn--signal nav__cta">
            Request a court
            <Arrow />
          </Anchor>
        </div>
        <button
          ref={burgerRef}
          className={open ? 'nav__burger is-open' : 'nav__burger'}
          type="button"
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
        </button>
      </div>
      <motion.span className="nav__bar" style={{ scaleX: scrollYProgress }} />
      <AnimatePresence>
        {open ? (
          <motion.div
            id="site-menu"
            ref={menuRef}
            className="menu"
            initial={{ y: '-100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
          >
            <nav aria-label="Mobile">
              {links.map((link) => (
                <Anchor key={link.href} href={link.href} onNavigate={() => setOpen(false)}>
                  {link.label}
                  <span>{link.index}</span>
                </Anchor>
              ))}
            </nav>
            <div className="menu__foot">
              <div className="menu__session">
                {ready ? <SessionLinks user={user} menu onNavigate={closeMenu} onSignOut={() => void leave()} /> : null}
              </div>
              {outError ? <p className="form__alert">{outError}</p> : null}
              <p className="menu__note">Where sport takes centre stage</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}

function SessionLinks({
  user,
  menu = false,
  onNavigate,
  onSignOut,
}: {
  user: { username: string; role: 'client' | 'admin' } | null
  menu?: boolean
  onNavigate?: () => void
  onSignOut?: () => void
}) {
  if (!user) {
    return (
      <Link to="/sign-in" className={menu ? 'btn btn--lime' : 'btn btn--ghost'} onClick={onNavigate}>
        Sign in
      </Link>
    )
  }
  const accountClass = menu && user.role === 'client' ? 'btn btn--lime' : 'btn btn--ghost'
  return (
    <>
      <Link to="/account" className={accountClass} onClick={onNavigate}>
        Account
      </Link>
      {user.role === 'admin' ? (
        <Link to="/admin" className={menu ? 'btn btn--lime' : 'btn btn--ghost'} onClick={onNavigate}>
          Desk
        </Link>
      ) : null}
      {menu ? (
        <button className="btn btn--ghost" type="button" onClick={onSignOut}>
          Sign out
        </button>
      ) : null}
    </>
  )
}
