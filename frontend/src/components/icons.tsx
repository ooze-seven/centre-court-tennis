import { motion, useReducedMotion } from 'framer-motion'
import { useId } from 'react'

const ease = [0.16, 1, 0.3, 1] as const

const view = { once: true, amount: 0.6 } as const

export function RacketIcon() {
  const reduce = useReducedMotion()
  const clip = `head${useId().replace(/:/g, '')}`
  return (
    <svg className="ico" viewBox="0 0 64 64" fill="none" strokeLinecap="round" aria-hidden="true">
      <motion.line
        className="line"
        x1="32"
        y1="38"
        x2="32"
        y2="57"
        strokeWidth="2.2"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.45, ease }}
      />
      {[46, 50, 54].map((y, index) => (
        <motion.line
          key={y}
          className="accent"
          x1="27.5"
          x2="36.5"
          y1={y}
          y2={y}
          strokeWidth="2.3"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={view}
          transition={{ duration: 0.35, delay: 0.15 + index * 0.08, ease }}
        />
      ))}
      <motion.path
        className="line"
        d="M23 33 L32 40"
        strokeWidth="1.6"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.4, delay: 0.2, ease }}
      />
      <motion.path
        className="line"
        d="M41 33 L32 40"
        strokeWidth="1.6"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.4, delay: 0.28, ease }}
      />
      <motion.ellipse
        className="line"
        cx="32"
        cy="21"
        rx="14"
        ry="16"
        strokeWidth="1.7"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.9, delay: 0.15, ease }}
      />
      <defs>
        <clipPath id={clip}>
          <ellipse cx="32" cy="21" rx="12" ry="14" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {[10, 14, 18, 22, 26, 30].map((y, index) => (
          <motion.line
            key={`h${y}`}
            className="accent"
            x1="16"
            x2="48"
            y1={y}
            y2={y}
            strokeWidth="0.8"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            initial={{ scaleX: reduce ? 1 : 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={view}
            transition={{ duration: 0.4, delay: 0.35 + index * 0.05, ease }}
          />
        ))}
        {[22, 27, 32, 37, 42].map((x, index) => (
          <motion.line
            key={`v${x}`}
            className="line"
            x1={x}
            x2={x}
            y1="6"
            y2="36"
            strokeWidth="0.7"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            initial={{ scaleY: reduce ? 1 : 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={view}
            transition={{ duration: 0.45, delay: 0.5 + index * 0.05, ease }}
          />
        ))}
      </g>
      <motion.line
        className="accent"
        x1="28"
        x2="36"
        y1="58"
        y2="58"
        strokeWidth="2.4"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.3, delay: 0.4 }}
      />
    </svg>
  )
}

export function CourtIcon() {
  const reduce = useReducedMotion()
  return (
    <svg className="ico" viewBox="0 0 64 64" fill="none" strokeLinecap="round" aria-hidden="true">
      <motion.rect
        className="line"
        x="12"
        y="8"
        width="40"
        height="48"
        strokeWidth="1.6"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.8, ease }}
      />
      <motion.line
        className="line"
        x1="22"
        y1="8"
        x2="22"
        y2="56"
        strokeWidth="1.2"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.6, delay: 0.15, ease }}
      />
      <motion.line
        className="line"
        x1="42"
        y1="8"
        x2="42"
        y2="56"
        strokeWidth="1.2"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.6, delay: 0.22, ease }}
      />
      <motion.line
        className="line"
        x1="12"
        y1="22"
        x2="52"
        y2="22"
        strokeWidth="1.2"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.5, delay: 0.3, ease }}
      />
      <motion.line
        className="line"
        x1="12"
        y1="42"
        x2="52"
        y2="42"
        strokeWidth="1.2"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.5, delay: 0.36, ease }}
      />
      <motion.line
        className="line"
        x1="32"
        y1="22"
        x2="32"
        y2="42"
        strokeWidth="1.2"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.4, delay: 0.42, ease }}
      />
      <motion.line
        className="accent"
        x1="8"
        y1="32"
        x2="56"
        y2="32"
        strokeWidth="2"
        strokeDasharray="3 3"
        animate={reduce ? { strokeDashoffset: 0 } : { strokeDashoffset: [0, -12] }}
        transition={reduce ? { duration: 0 } : { duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
      <motion.rect
        className="accent-fill"
        x="9"
        y="29"
        width="3"
        height="6"
        style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={view}
        transition={{ duration: 0.3, delay: 0.5 }}
      />
      <motion.rect
        className="accent-fill"
        x="52"
        y="29"
        width="3"
        height="6"
        style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={view}
        transition={{ duration: 0.3, delay: 0.58 }}
      />
    </svg>
  )
}

export function LightIcon() {
  const reduce = useReducedMotion()
  return (
    <svg className="ico" viewBox="0 0 64 64" fill="none" strokeLinecap="round" aria-hidden="true">
      <motion.path
        className="accent-fill"
        d="M34 22 L24 54 H58 L48 22 Z"
        animate={reduce ? { opacity: 0.35 } : { opacity: [0.12, 0.38, 0.16, 0.34, 0.12] }}
        transition={reduce ? { duration: 0 } : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.line
        className="line"
        x1="16"
        y1="58"
        x2="30"
        y2="58"
        strokeWidth="1.8"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.35, ease }}
      />
      <motion.line
        className="line"
        x1="23"
        y1="58"
        x2="23"
        y2="18"
        strokeWidth="1.8"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.55, delay: 0.1, ease }}
      />
      <motion.line
        className="line"
        x1="23"
        y1="18"
        x2="48"
        y2="14"
        strokeWidth="1.6"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.4, delay: 0.28, ease }}
      />
      <motion.rect
        className="line"
        x="34"
        y="10"
        width="24"
        height="8"
        strokeWidth="1.4"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.5, delay: 0.35, ease }}
      />
      {[40, 46, 52].map((cx, index) => (
        <motion.circle
          key={cx}
          className="accent-fill"
          cx={cx}
          cy="14"
          r="1.35"
          animate={reduce ? { opacity: 1 } : { opacity: [0.25, 1, 0.35, 1, 0.25] }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 1.6 + index * 0.45, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 }
          }
        />
      ))}
    </svg>
  )
}

export function RidgeIcon() {
  const reduce = useReducedMotion()
  const drift = (duration: number, distance: number) =>
    reduce
      ? undefined
      : {
          y: [0, distance, 0],
          transition: { duration, repeat: Infinity, ease: 'easeInOut' as const },
        }
  return (
    <svg className="ico" viewBox="0 0 64 64" fill="none" strokeLinecap="round" aria-hidden="true">
      <motion.path
        className="accent-fill"
        opacity="0.35"
        d="M4 46 L20 28 L32 38 L46 20 L64 46 Z"
        animate={drift(7, -2.5)}
      />
      <motion.path
        className="accent-fill"
        opacity="0.6"
        d="M2 52 L18 36 L34 48 L50 32 L66 54 L2 54 Z"
        animate={drift(5.5, -1.5)}
      />
      <motion.path
        className="line"
        d="M0 58 L16 46 L34 58 L52 42 L68 58"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 1, ease }}
      />
      <motion.circle
        className="accent-fill"
        cx="50"
        cy="16"
        r="3"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={reduce ? undefined : { scale: [1, 1.18, 1] }}
        transition={reduce ? undefined : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.rect
        className="line"
        x="26"
        y="54"
        width="14"
        height="6"
        strokeWidth="1.2"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.5, delay: 0.4, ease }}
      />
      <motion.line
        className="accent"
        x1="26"
        y1="57"
        x2="40"
        y2="57"
        strokeWidth="1"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.4, delay: 0.55, ease }}
      />
    </svg>
  )
}

export function FenceIcon() {
  const reduce = useReducedMotion()
  return (
    <svg className="ico" viewBox="0 0 64 64" fill="none" strokeLinecap="round" aria-hidden="true">
      {[14, 50].map((x, index) => (
        <motion.line
          key={x}
          className="line"
          x1={x}
          x2={x}
          y1="12"
          y2="54"
          strokeWidth="1.8"
          style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}
          initial={{ scaleY: reduce ? 1 : 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={view}
          transition={{ duration: 0.45, delay: index * 0.08, ease }}
        />
      ))}
      <motion.line
        className="line"
        x1="14"
        y1="16"
        x2="50"
        y2="16"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.45, delay: 0.15, ease }}
      />
      <motion.line
        className="line"
        x1="14"
        y1="50"
        x2="50"
        y2="50"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.45, delay: 0.22, ease }}
      />
      {[20, 26, 32, 38, 44].map((x, index) => (
        <motion.line
          key={x}
          className="line"
          x1={x}
          x2={x}
          y1="16"
          y2="50"
          strokeWidth="0.8"
          initial={{ opacity: 0.2 }}
          animate={reduce ? { opacity: 0.75 } : { opacity: [0.28, 0.9, 0.4] }}
          transition={
            reduce
              ? { duration: 0.2 }
              : { duration: 2.3 + index * 0.28, repeat: Infinity, ease: 'easeInOut', delay: index * 0.18 }
          }
        />
      ))}
      <motion.rect
        className="accent-fill"
        x="18"
        y="26"
        width="28"
        height="9"
        style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}
        initial={{ scaleX: reduce ? 1 : 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={view}
        transition={{ duration: 0.55, delay: 0.35, ease }}
      />
      <motion.line
        className="ink"
        x1="22"
        y1="30.5"
        x2="42"
        y2="30.5"
        strokeWidth="1.2"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={view}
        transition={{ duration: 0.4, delay: 0.7, ease }}
      />
    </svg>
  )
}

export function Arrow() {
  return (
    <svg className="arrow" viewBox="0 0 28 12" fill="none" aria-hidden="true">
      <path d="M0 6h26" stroke="currentColor" strokeWidth="1.4" />
      <path d="M20 1.2 26 6 20 10.8" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
