'use client'

import { useRef, useState } from 'react'

export type GalleryPhoto = { url: string; alt: string; credit?: string | null; href?: string | null }

/**
 * Galerie de fiche (modèle commun, validé par Rad le 2026-10-26) : grande photo 4:3, flèches, compteur,
 * vignettes, glissement au doigt ; le crédit de la photo affichée reste toujours lisible sous l’image.
 */
export function PhotoGallery({ photos, title }: { photos: GalleryPhoto[]; title: string }) {
  const [i, setI] = useState(0)
  const start = useRef<number | null>(null)
  if (!photos.length)
    return (
      <figure className="pg">
        <div className="pg-main is-empty" role="img" aria-label={`${title} : pas encore de photo`} />
      </figure>
    )
  const n = photos.length
  const p = photos[Math.min(i, n - 1)]
  const go = (d: number) => setI((x) => (x + d + n) % n)
  return (
    <figure className="pg">
      <div
        className="pg-main"
        onTouchStart={(e) => (start.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (start.current == null) return
          const dx = e.changedTouches[0].clientX - start.current
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          start.current = null
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.url} alt={p.alt || title} />
        {n > 1 && (
          <>
            <button type="button" className="pg-arrow is-prev" aria-label="Photo précédente" onClick={() => go(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="m15 6-6 6 6 6" />
              </svg>
            </button>
            <button type="button" className="pg-arrow is-next" aria-label="Photo suivante" onClick={() => go(1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
            <span className="pg-count">
              {i + 1} / {n}
            </span>
          </>
        )}
      </div>
      <figcaption className="pg-foot">
        {n > 1 && (
          <span className="pg-thumbs" role="group" aria-label="Photos">
            {photos.slice(0, 8).map((x, k) => (
              <button key={x.url} type="button" aria-label={`Photo ${k + 1} sur ${n}`} aria-pressed={k === i} style={{ backgroundImage: `url(${x.url})` }} onClick={() => setI(k)} />
            ))}
          </span>
        )}
        {p.credit && (
          <small className="pg-credit">
            {p.href ? (
              <a href={p.href} target="_blank" rel="noopener">
                {p.credit}
              </a>
            ) : (
              p.credit
            )}
          </small>
        )}
      </figcaption>
    </figure>
  )
}
