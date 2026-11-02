export function Marquee({ ghost = false }: { ghost?: boolean }) {
  const chunk = (
    <div className="marquee__half">
      <span>Centrecourt</span>
      <i className="marquee__dot" />
      <span>Tennis</span>
      <i className="marquee__dot" />
      <span>Where sport takes centre stage</span>
      <i className="marquee__dot" />
      <span>Hard court</span>
      <i className="marquee__dot" />
      <span>Floodlit</span>
      <i className="marquee__dot" />
    </div>
  )

  return (
    <div className={ghost ? 'marquee marquee--ghost' : 'marquee'} aria-hidden="true">
      <div className="marquee__track">
        {chunk}
        {chunk}
      </div>
    </div>
  )
}
