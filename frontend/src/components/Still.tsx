import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

export function Still({
  src,
  alt,
  ratio = '16 / 10',
  position = '50% 50%',
  width,
  height,
  title,
  detail,
  bar = false,
  eager = false,
  className = '',
}: {
  src: string
  alt: string
  ratio?: string
  position?: string
  width: number
  height: number
  title?: string
  detail?: string
  bar?: boolean
  eager?: boolean
  className?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const coarse = useCoarsePointer()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], reduce || coarse ? ['0%', '0%'] : ['-6%', '6%'])

  return (
    <figure ref={ref} className={`still ${className}`}>
      <div className="still__clip" style={{ '--ratio': ratio } as CSSProperties}>
        <motion.img
          src={src}
          alt={alt}
          width={width}
          height={height}
          style={{ y, objectPosition: position }}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          decoding="async"
        />
        {title && !bar ? (
          <figcaption className="still__overlay">
            <strong>{title}</strong>
            {detail ? <em>{detail}</em> : null}
          </figcaption>
        ) : null}
      </div>
      {title && bar ? (
        <figcaption className="still__bar">
          <strong>{title}</strong>
          {detail ? <span>{detail}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  )
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(hover: none) and (pointer: coarse)')
    const apply = () => setCoarse((current) => (current === query.matches ? current : query.matches))
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  return coarse
}
