'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/** Carrousel horizontal natif (défilement par aimantation), flèches au clavier et à la souris, glisser au doigt. */
export function Carousel({ label, children, variant = 'cards' }: { label: string; children: ReactNode; variant?: 'cards' | 'wide' | 'tiles' }) {
  const track = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })
  const update = useCallback(() => {
    const t = track.current
    if (!t) return
    setEdge({ start: t.scrollLeft < 8, end: t.scrollLeft + t.clientWidth > t.scrollWidth - 8 })
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
    const t = track.current
    if (t) t.scrollBy({ left: dir * t.clientWidth * 0.85, behavior: 'smooth' })
  }
  return (
    <div className={`carousel carousel-${variant}`} role="region" aria-roledescription="carrousel" aria-label={label}>
      <div className="carousel-track" ref={track} tabIndex={0} onKeyDown={(e) => (e.key === 'ArrowRight' ? go(1) : e.key === 'ArrowLeft' ? go(-1) : null)}>
        {children}
      </div>
      <div className="carousel-controls">
        <button type="button" aria-label="Précédent" disabled={edge.start} onClick={() => go(-1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button type="button" aria-label="Suivant" disabled={edge.end} onClick={() => go(1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  )
}
