import { Headline } from './Headline.tsx'
import { RacketIcon } from './icons.tsx'
import { Schedule } from './Schedule.tsx'
import { Still } from './Still.tsx'

export function Desk() {
  return (
    <section className="section desk" id="desk">
      <div className="wrap wrap--wide">
        <div className="desk__intro">
          <div>
            <p className="eyebrow">05 — The desk</p>
            <div className="desk__title">
              <div className="desk__racket">
                <RacketIcon />
              </div>
              <Headline>Hold a court.</Headline>
            </div>
            <p className="dek">
              Pick an open hour. Daytime, 06:00 to 16:00, is 600 pesos an hour. Evening and lights are 700. Arrive 10 minutes early. The desk confirms before anyone walks on.
            </p>
          </div>
          <div className="desk__photo">
            <Still
              src="/frames/sign.jpg"
              alt="Centrecourt Tennis sign on a white brick wall, with palms and a covered desk behind."
              width={1024}
              height={1024}
              ratio="16 / 10"
              position="50% 36%"
            />
          </div>
        </div>
        <Schedule />
      </div>
    </section>
  )
}
