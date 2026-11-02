import { AnimatePresence, motion } from 'framer-motion'
import { useState, type CSSProperties } from 'react'
import { Headline } from './Headline.tsx'

type Zone = 'apron' | 'baseline' | 'service' | 'alley' | 'net'

const zones: { id: Zone; label: string; title: string; copy: string }[] = [
  {
    id: 'apron',
    label: 'Apron',
    title: 'Lime apron',
    copy: 'The run-off around the hard court. It is the first colour from the gate, and it matches the mark on the wall.',
  },
  {
    id: 'baseline',
    label: 'Baseline',
    title: 'Baseline',
    copy: 'The point starts with both feet behind this line. There is one at each end, with the ridge just past the fence.',
  },
  {
    id: 'service',
    label: 'Service box',
    title: 'Service box',
    copy: 'A serve has to land in the box diagonally opposite. Four boxes, two on each side of the net.',
  },
  {
    id: 'alley',
    label: 'Doubles alley',
    title: 'Doubles alley',
    copy: 'The lane between the singles and doubles sidelines. In play when four are on. Out, when it is singles.',
  },
  {
    id: 'net',
    label: 'Net',
    title: 'Net',
    copy: 'White tape, dark mesh, posts set at the sides. It cuts the court in half.',
  },
]

export function CourtMap() {
  const [zone, setZone] = useState<Zone>('apron')
  const current = zones.find((item) => item.id === zone) ?? zones[0]

  return (
    <section className="section markings" id="markings">
      <div className="wrap markings__grid">
        <div>
          <p className="eyebrow">02 — The markings</p>
          <Headline>Read the court.</Headline>
          <p className="dek" style={{ marginTop: '1rem' }}>
            The lines are painted rules. Pick one.
          </p>
        </div>
        <div className="readout" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
            >
              <h3>{current.title}</h3>
              <p className="dek">{current.copy}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="legend" role="group" aria-label="Court markings">
          {zones.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={zone === item.id}
              onClick={() => setZone(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="markings__stage">
          <div className={zone === 'apron' ? 'sheet is-apron' : 'sheet'}>
            <button
              type="button"
              className="sheet__apron"
              tabIndex={-1}
              aria-hidden="true"
              onMouseEnter={() => setZone('apron')}
              onClick={() => setZone('apron')}
            />
            <div className="surface" data-zone={zone}>
              <ZoneButton kind="alley" label="Doubles alley" style={{ top: 0, left: 0, width: '12.5%', height: '100%' }} onPick={() => setZone('alley')} pressed={zone === 'alley'} />
              <ZoneButton kind="alley" label="Doubles alley" style={{ top: 0, left: '87.5%', width: '12.5%', height: '100%' }} onPick={() => setZone('alley')} pressed={zone === 'alley'} />
              <ZoneButton kind="baseline" label="Baseline" style={{ top: 0, left: '12.5%', width: '75%', height: '23.08%' }} onPick={() => setZone('baseline')} pressed={zone === 'baseline'} />
              <ZoneButton kind="baseline" label="Baseline" style={{ top: '76.92%', left: '12.5%', width: '75%', height: '23.08%' }} onPick={() => setZone('baseline')} pressed={zone === 'baseline'} />
              <ZoneButton kind="service" label="Service box" style={{ top: '23.08%', left: '12.5%', width: '37.5%', height: '25%' }} onPick={() => setZone('service')} pressed={zone === 'service'} />
              <ZoneButton kind="service" label="Service box" style={{ top: '23.08%', left: '50%', width: '37.5%', height: '25%' }} onPick={() => setZone('service')} pressed={zone === 'service'} />
              <ZoneButton kind="service" label="Service box" style={{ top: '51.92%', left: '12.5%', width: '37.5%', height: '25%' }} onPick={() => setZone('service')} pressed={zone === 'service'} />
              <ZoneButton kind="service" label="Service box" style={{ top: '51.92%', left: '50%', width: '37.5%', height: '25%' }} onPick={() => setZone('service')} pressed={zone === 'service'} />
              <ZoneButton kind="net" label="Net" style={{ top: '47.6%', left: 0, width: '100%', height: '4.8%', zIndex: 2 }} onPick={() => setZone('net')} pressed={zone === 'net'} />
              <span className="court-rule court-rule--v court-rule--singles-l" />
              <span className="court-rule court-rule--v court-rule--singles-r" />
              <span className="court-rule court-rule--h court-rule--service-t" />
              <span className="court-rule court-rule--h court-rule--service-b" />
              <span className="court-rule court-rule--centre" />
              <span className="court-rule court-rule--tick-t" />
              <span className="court-rule court-rule--tick-b" />
              <div className="netband" />
            </div>
            <span className="post post--l" />
            <span className="post post--r" />
            <p className="sheet__note">Doubles court</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ZoneButton({
  kind,
  label,
  style,
  pressed,
  onPick,
}: {
  kind: string
  label: string
  style: CSSProperties
  pressed: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      className="zone"
      data-kind={kind}
      tabIndex={-1}
      aria-hidden="true"
      aria-label={label}
      aria-pressed={pressed}
      style={style}
      onMouseEnter={onPick}
      onClick={onPick}
    />
  )
}
