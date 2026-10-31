'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'

export type Slide = { src: string; title: string; place: string; href: string; credit: string | null }

/** Fond de héros : photos en fondu enchaîné avec léger zoom (effet Ken Burns), parallaxe au défilement (Motion), crédit et lien vers le lieu. */
export function Slideshow({ slides, interval = 6500 }: { slides: Slide[]; interval?: number }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), interval)
    return () => clearInterval(t)
  }, [paused, slides.length, interval])
  const s = slides[i]
  // La photo défile moins vite que la page : profondeur douce, coupée si l’appareil demande moins d’animations.
  const box = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: box, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '22%'])
  return (
    <>
      <motion.div ref={box} className="slideshow" aria-hidden="true" style={{ y }}>
        {slides.map((x, k) => (
          <div key={x.src} className={`slide ${k === i ? 'is-active' : ''}`} style={{ backgroundImage: `url(${x.src})` }} />
        ))}
      </motion.div>
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
