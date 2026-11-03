import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function PassMark({ pass }: { pass: string }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let cancel = false
    const target = `${window.location.origin}/admin/check/${pass}`
    QRCode.toDataURL(target, {
      margin: 1,
      width: 280,
      color: { dark: '#12281c', light: '#f6f7f2' },
    })
      .then((url) => {
        if (!cancel) setSrc(url)
      })
      .catch(() => {
        if (!cancel) setSrc('')
      })
    return () => {
      cancel = true
    }
  }, [pass])

  return (
    <figure className="pass">
      {src ? <img src={src} alt="" width={220} height={220} /> : null}
      <figcaption>
        Show this at the court. The desk scans it against the book.
        <span className="pass__code">{pass}</span>
      </figcaption>
    </figure>
  )
}
