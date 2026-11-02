'use client'

import { useEffect, useState } from 'react'
import { usePath } from '@/platform/ui/lang'
import type { Lang } from '@/platform/i18n'
import { HomeSearch } from './HomeSearch'

const T = {
  fr: { open: 'Rechercher', close: 'Fermer la recherche' },
  en: { open: 'Search', close: 'Close search' },
  ar: { open: 'بحث', close: 'إغلاق البحث' },
}

/**
 * Recherche de l’en-tête sur ordinateur (maquette validée par Rad, 2026-11-02) : une loupe qui ouvre la même barre
 * que l’accueil (pilule sombre, micro, flèche verte, suggestions), sous l’en-tête, avec un voile sur la page.
 * Une seule barre visible à la fois : sur l’accueil, la loupe reste cachée tant que la grande recherche est à l’écran.
 */
export function HeaderSearch({ lang = 'fr' }: { lang?: Lang }) {
  const path = usePath()
  // Ouverture et visibilité de la grande recherche, propres à la page : un changement de page referme le panneau.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const [heroOn, setHeroOn] = useState<string | null>(null)
  const heroVisible = heroOn === path
  const open = openOn === path && !heroVisible
  const setOpen = (v: boolean) => setOpenOn(v ? path : null)

  useEffect(() => {
    const hero = document.querySelector('.xp-hero .search-bar')
    if (!hero) return
    const io = new IntersectionObserver(([e]) => setHeroOn(e.isIntersecting ? path : null), { rootMargin: '-58px 0px 0px 0px' })
    io.observe(hero)
    return () => io.disconnect()
  }, [path])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenOn(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const t = T[lang]
  return (
    <>
      <button type="button" className={`icon-button header-search-button${heroVisible ? ' is-hidden' : ''}`} aria-label={open ? t.close : t.open} aria-expanded={open} aria-controls="header-search-panel" hidden={heroVisible} onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>}
        </svg>
      </button>
      {open && (
        <>
          <div className="header-search-veil" onClick={() => setOpen(false)} aria-hidden="true" />
          <div id="header-search-panel" className="header-search-panel" role="dialog" aria-label={t.open}>
            <div className="container">
              <HomeSearch lang={lang} idBase="header-search" autoFocus />
            </div>
          </div>
        </>
      )}
    </>
  )
}
