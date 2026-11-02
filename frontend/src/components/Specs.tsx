import type { ComponentType } from 'react'
import { CourtIcon, FenceIcon, LightIcon, RidgeIcon } from './icons.tsx'
import { Headline } from './Headline.tsx'

const rows: { title: string; copy: string; icon: ComponentType }[] = [
  {
    title: 'Surface',
    copy: 'Acrylic hard court. Dark where you play, lime where you run off, white where the lines are.',
    icon: CourtIcon,
  },
  {
    title: 'Floodlights',
    copy: 'Masts over the fence, for the hours after the ridge takes the sun.',
    icon: LightIcon,
  },
  {
    title: 'The ridge',
    copy: 'Forested slopes close the view past both baselines.',
    icon: RidgeIcon,
  },
  {
    title: 'The fence',
    copy: 'Chain link around the playing area. The club banner hangs on the far side.',
    icon: FenceIcon,
  },
]

export function Specs() {
  return (
    <section className="section onsite" id="onsite">
      <div className="wrap">
        <p className="eyebrow">03 — On site</p>
        <Headline>From the gate.</Headline>
        <p className="dek" style={{ margin: '1rem 0 1.4rem' }}>
          What is actually on the ground.
        </p>
        <div>
          {rows.map((row) => {
            const Icon = row.icon
            return (
              <article className="spec" key={row.title}>
                <div className="spec__icon">
                  <Icon />
                </div>
                <div className="spec__body">
                  <h3>{row.title}</h3>
                  <p>{row.copy}</p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
