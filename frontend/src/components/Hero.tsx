import { CourtIcon, LightIcon, RidgeIcon, Arrow } from './icons.tsx'
import { Anchor } from './Anchor.tsx'
import { Still } from './Still.tsx'

export function Hero() {
  return (
    <section className="hero">
      <div className="wrap hero__grid">
        <div className="hero__intro">
          <h1 id="page-title" tabIndex={-1}>
            <span className="hero__lead">Where sport takes</span>
            <span className="hero__huge">Centre</span>
            <span className="hero__huge hero__huge--ghost">Stage</span>
          </h1>
        </div>
        <div className="hero__media">
          <div className="hero__frame">
            <Still
              src="/frames/racket.jpg"
              alt="A racket held at the baseline, yellow strings in front of the club banner, the court and the ridge behind."
              width={768}
              height={1024}
              ratio="4 / 5"
              position="50% 68%"
              eager
            />
          </div>
          <p className="hero__cap">Strings up. Court ahead.</p>
        </div>
        <div className="hero__rest">
          <p className="dek">
            Acrylic hard courts, a lime apron, and the ridge behind both baselines.
          </p>
          <div className="hero__actions">
            <Anchor href="#desk" className="btn btn--lime btn--signal">
              Request a court
              <Arrow />
            </Anchor>
            <Anchor href="#grounds" className="btn btn--ghost">
              The grounds
            </Anchor>
          </div>
          <ul className="score">
            <li>
              <CourtIcon />
              <span>Surface</span>
              <strong>Hard court</strong>
            </li>
            <li>
              <LightIcon />
              <span>Lights</span>
              <strong>Floodlit</strong>
            </li>
            <li>
              <RidgeIcon />
              <span>Backdrop</span>
              <strong>The ridge</strong>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
