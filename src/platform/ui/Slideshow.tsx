'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'

export type Slide = { src: string; title: string; place: string; href: string; credit: string | null }

type Shown = { i: number; seen: number[] }
const goTo = (s: Shown, k: number, n: number): Shown => ({ i: k, seen: [...new Set([...s.seen, k, (k + 1) % n])] })

/** Fond de héros : photos en fondu enchaîné avec léger zoom (effet Ken Burns), parallaxe au défilement (Motion), crédit et lien vers le lieu. */
export function Slideshow({ slides, interval = 6500 }: { slides: Slide[]; interval?: number }) {
  // Diapositives dont le fond est demandé : l’active et la suivante ; une photo déjà chargée le reste (fondu de sortie intact).
  const [{ i, seen }, setShow] = useState<Shown>({ i: 0, seen: [0, 1] })
  const setI = (k: number) => setShow((s) => goTo(s, k, slides.length))
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setShow((s) => goTo(s, (s.i + 1) % slides.length, slides.length)), interval)
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
          <div key={x.src} className={`slide ${k === i ? 'is-active' : ''}`} style={seen.includes(k) ? { backgroundImage: `url(${x.src})` } : undefined} />
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
