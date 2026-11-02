import { Anchor } from './Anchor.tsx'
import { Brand } from './Brand.tsx'
import { Marquee } from './Marquee.tsx'

export function Footer() {
  return (
    <footer className="footer">
      <Marquee ghost />
      <div className="wrap footer__grid">
        <div>
          <Brand variant="stack" />
          <p className="footer__tag">Where sport takes centre stage</p>
        </div>
        <nav aria-label="Footer">
          <Anchor href="#grounds">The grounds</Anchor>
          <Anchor href="#markings">The court</Anchor>
          <Anchor href="#frames">Frames</Anchor>
          <Anchor href="#onsite">On site</Anchor>
          <Anchor href="#desk">Request a court</Anchor>
        </nav>
        <p className="footer__legal">© 2026 Centrecourt Tennis</p>
      </div>
    </footer>
  )
}
