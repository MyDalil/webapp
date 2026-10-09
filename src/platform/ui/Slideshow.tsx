'use client'

import { useEffect, useState } from 'react'

export type Slide = { src: string; title: string; place: string; href: string; credit: string | null }

/** Fond de héros : photos en fondu enchaîné avec léger zoom (effet Ken Burns), crédit et lien vers le lieu. */
export function Slideshow({ slides, interval = 6500 }: { slides: Slide[]; interval?: number }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), interval)
    return () => clearInterval(t)
  }, [paused, slides.length, interval])
  const s = slides[i]
  return (
    <>
      <div className="slideshow" aria-hidden="true">
        {slides.map((x, k) => (
          <div key={x.src} className={`slide ${k === i ? 'is-active' : ''}`} style={{ backgroundImage: `url(${x.src})` }} />
        ))}
      </div>
      {s && (
        <div className="slideshow-meta">
          <a href={s.href} className="slideshow-place">
            <span>{s.place}</span>
            <strong>{s.title}</strong>
          </a>
          <div className="slideshow-dots" role="tablist" aria-label="Photos">
            {slides.map((x, k) => (
              <button key={x.src} type="button" role="tab" aria-selected={k === i} aria-label={x.title} onClick={() => setI(k)} />
            ))}
            <button type="button" className="slideshow-pause" aria-label={paused ? 'Reprendre le diaporama' : 'Mettre en pause le diaporama'} onClick={() => setPaused(!paused)}>
              {paused ? '▶' : '❚❚'}
            </button>
          </div>
          {s.credit && <small className="slideshow-credit">{s.credit}</small>}
        </div>
      )}
    </>
  )
}
