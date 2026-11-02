import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useLenis } from 'lenis/react'

const ease = [0.76, 0, 0.24, 1] as const

export function Intro() {
  const reduce = useReducedMotion()
  const lenis = useLenis()
  const [active, setActive] = useState(() => {
    if (typeof window === 'undefined') return false
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const [phase, setPhase] = useState<'hold' | 'open'>('hold')

  useEffect(() => {
    if (!active) return
    const nodes = document.querySelectorAll('header, main, footer')
    nodes.forEach((node) => {
      node.setAttribute('inert', '')
    })
    document.documentElement.classList.add('lock')
    lenis?.stop()
    const timer = window.setTimeout(() => setPhase('open'), 1500)
    return () => {
      window.clearTimeout(timer)
      nodes.forEach((node) => {
        node.removeAttribute('inert')
      })
      document.documentElement.classList.remove('lock')
      lenis?.start()
    }
  }, [active, lenis])

  if (reduce || !active) return null

  function finish() {
    setActive(false)
    window.setTimeout(() => document.getElementById('page-title')?.focus(), 40)
  }

  return (
    <div className="intro" role="presentation">
      <motion.div
        className="intro__half intro__half--top"
        animate={{ y: phase === 'open' ? '-100%' : '0%' }}
        transition={{ duration: 0.85, ease, delay: phase === 'open' ? 0.12 : 0 }}
      />
      <motion.div
        className="intro__half intro__half--bottom"
        animate={{ y: phase === 'open' ? '100%' : '0%' }}
        transition={{ duration: 0.85, ease, delay: phase === 'open' ? 0.12 : 0 }}
        onAnimationComplete={() => {
          if (phase === 'open') finish()
        }}
      />
      <motion.div
        className="intro__brand"
        animate={{ opacity: phase === 'open' ? 0 : 1, y: phase === 'open' ? -16 : 0 }}
        transition={{ duration: 0.28, ease }}
      >
        <div className="intro__seal">
          <svg className="intro__orbit" viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <motion.circle
              cx="50"
              cy="50"
              r="46"
              stroke="#F6F7F2"
              strokeWidth="1.4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              stroke="#CBE603"
              strokeWidth="1"
              strokeDasharray="5 8"
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            />
            <motion.path
              d="M18 50 H82"
              stroke="#CBE603"
              strokeWidth="1.4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.7, delay: 0.25 }}
            />
            <motion.path
              d="M68 18 H86"
              stroke="#F6F7F2"
              strokeWidth="2.4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.45 }}
            />
            <motion.path
              d="M68 82 H86"
              stroke="#F6F7F2"
              strokeWidth="2.4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.55 }}
            />
          </svg>
          <motion.div
            className="intro__logo"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <span className="brand__mark">
              <img src="/frames/mark.png" alt="" />
            </span>
          </motion.div>
        </div>
        <p className="intro__word">
          <span>Centrecourt</span>
          <small>Tennis</small>
        </p>
      </motion.div>
      <button className="intro__skip" type="button" onClick={() => setPhase('open')}>
        Enter
      </button>
    </div>
  )
}
