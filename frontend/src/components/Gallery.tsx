import { Headline } from './Headline.tsx'
import { Still } from './Still.tsx'

const shots = [
  {
    src: '/frames/dusk.jpg',
    alt: 'Hard court at dusk with the mountain ridge behind the far fence.',
    title: 'Blue hour',
    detail: '01',
    className: 'g-dusk',
    ratio: '16 / 10',
    position: '50% 48%',
    width: 1024,
    height: 768,
  },
  {
    src: '/frames/sky.jpg',
    alt: 'A sunlit hard court, wide yellow apron, net, and forested hills under a bright sky.',
    title: 'Open sky',
    detail: '02',
    className: 'g-sky',
    ratio: '16 / 10',
    position: '50% 62%',
    width: 1024,
    height: 1024,
  },
  {
    src: '/frames/racket.jpg',
    alt: 'Yellow strings of a racket in the foreground, the club banner and court beyond.',
    title: 'In hand',
    detail: '03',
    className: 'g-racket',
    ratio: '3 / 4',
    position: '50% 38%',
    width: 768,
    height: 1024,
  },
  {
    src: '/frames/sign.jpg',
    alt: 'The Centrecourt Tennis sign fixed to a white brick wall, palms behind it.',
    title: 'The wall',
    detail: '04',
    className: 'g-sign',
    ratio: '1 / 1',
    position: '50% 38%',
    width: 1024,
    height: 1024,
  },
  {
    src: '/frames/ridge.jpg',
    alt: 'Yellow apron in the foreground, dark court and a green mountain behind the fence.',
    title: 'The apron',
    detail: '05',
    className: 'g-ridge',
    ratio: '1 / 1',
    position: '50% 55%',
    width: 1024,
    height: 1024,
  },
]

export function Gallery() {
  return (
    <section className="section frames" id="frames">
      <div className="wrap wrap--wide">
        <div className="frames__head">
          <p className="eyebrow">04 — Frames</p>
          <Headline>Same courts. Different hours.</Headline>
        </div>
        <div className="gallery__grid">
          {shots.map((shot) => (
            <Still key={shot.src + shot.title} {...shot} />
          ))}
        </div>
      </div>
    </section>
  )
}
