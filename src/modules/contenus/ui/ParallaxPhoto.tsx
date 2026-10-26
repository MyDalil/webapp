'use client'

import { useEffect, useRef, useState } from 'react'

export function ParallaxPhoto({ src, alt, place, region, className = '' }: { src: string; alt: string; place: string; region: string; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  const [y, setY] = useState(0)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const wide = window.matchMedia('(min-width: 721px)')
    if (reduce.matches || !wide.matches) return
    let raf = 0
    const update = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > window.innerHeight) return
      const d = r.top + r.height / 2 - window.innerHeight / 2
      setY(Math.max(-18, Math.min(18, d * -0.045)))
    }
    const on = () => {
      raf ||= requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <figure ref={ref} className={`editorial-photo parallax-photo ${className}`} style={{ ['--parallax-y' as string]: `${y}px` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" />
      <figcaption>
        <strong>{place}</strong>
        <span>{region}</span>
      </figcaption>
    </figure>
  )
}
