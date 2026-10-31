'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { shellText } from '../i18n'
import { useLang } from './lang'

/** Carrousel horizontal natif (défilement par aimantation), flèches au clavier et à la souris, glisser au doigt. */
export function Carousel({ label, children, variant = 'cards' }: { label: string; children: ReactNode; variant?: 'cards' | 'wide' | 'tiles' }) {
  const track = useRef<HTMLDivElement>(null)
  const t = shellText(useLang())
  // De droite à gauche (arabe) : scrollLeft devient négatif, le sens des flèches s’inverse.
  const rtl = () => !!track.current && getComputedStyle(track.current).direction === 'rtl'
  const [edge, setEdge] = useState({ start: true, end: false })
  const update = useCallback(() => {
    const t = track.current
    if (!t) return
    const x = Math.abs(t.scrollLeft)
    setEdge({ start: x < 8, end: x + t.clientWidth > t.scrollWidth - 8 })
  }, [])
  useEffect(() => {
    update()
    const t = track.current
    t?.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      t?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [update])
  const go = (dir: 1 | -1) => {
    const el = track.current
    if (el) el.scrollBy({ left: (rtl() ? -dir : dir) * el.clientWidth * 0.85, behavior: 'smooth' })
  }
  return (
    <div className={`carousel carousel-${variant}`} role="region" aria-roledescription={t.carousel} aria-label={label}>
      <div className="carousel-track" ref={track} tabIndex={0} onKeyDown={(e) => (e.key === 'ArrowRight' ? go(rtl() ? -1 : 1) : e.key === 'ArrowLeft' ? go(rtl() ? 1 : -1) : null)}>
        {children}
      </div>
      <div className="carousel-controls">
        <button type="button" aria-label={t.prev} disabled={edge.start} onClick={() => go(-1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button type="button" aria-label={t.next} disabled={edge.end} onClick={() => go(1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  )
}
