import { Headline } from './Headline.tsx'
import { Still } from './Still.tsx'

export function Grounds() {
  return (
    <section className="section grounds" id="grounds">
      <div className="wrap grounds__grid">
        <p className="eyebrow">01 — The grounds</p>
        <Headline>Dark centre. Lime edge.</Headline>
        <div className="grounds__copy">
          <p className="dek">
            The playing surface is the dark one. The apron around it is lime — the same lime as the mark on the wall by the desk.
          </p>
          <p className="dek">
            Chain-link fence, a full-size net, masts for when the light goes. The ridge stays in frame from either baseline.
          </p>
        </div>
      </div>
      <div className="wrap wrap--wide">
        <Still
          src="/frames/dusk.jpg"
          alt="An empty hard court at dusk, dark green surface, yellow apron, fence and forested mountains under a heavy sky."
          width={1024}
          height={768}
          ratio="16 / 9"
          position="50% 55%"
          title="Blue hour"
          detail="Floodlights over the far baseline"
          bar
        />
      </div>
    </section>
  )
}
