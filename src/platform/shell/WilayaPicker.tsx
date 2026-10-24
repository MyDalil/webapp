'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { setWilaya, useWilaya } from './wilaya'
import { NavIcon } from './NavIcon'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Sélecteur de wilaya de l’en-tête : facultatif, « Toute l’Algérie » par défaut.
 * `open` / `onToggle` viennent de l’en-tête (un seul menu ouvert à la fois).
 */
export function WilayaPicker({ open, onToggle, inline = false }: { open: boolean; onToggle: (open: boolean) => void; inline?: boolean }) {
  const current = useWilaya()
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (open) {
      setQ('')
      requestAnimationFrame(() => input.current?.focus())
    }
  }, [open])
  const list = useMemo(() => {
    const n = norm(q.trim())
    return WILAYAS.filter((w) => !n || norm(w.name).includes(n) || String(w.code) === n)
  }, [q])
  const choose = (code: number | null) => {
    setWilaya(code ? { code, name: WILAYAS.find((w) => w.code === code)!.name } : null)
    onToggle(false)
  }
  return (
    <div className={`wilaya-wrap ${inline ? 'is-inline' : ''}`}>
      <button className="wilaya-pill" type="button" data-menu-trigger="wilaya" aria-expanded={open} aria-haspopup="dialog" aria-label={`Wilaya : ${current?.name ?? 'Toute l’Algérie'}. Changer`} onClick={() => onToggle(!open)}>
        <NavIcon name="pin" />
        <span>{current?.name ?? 'Toute l’Algérie'}</span>
        <svg className="chev" viewBox="0 0 16 16" aria-hidden="true">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="utility-menu wilaya-menu" data-menu="wilaya" role="dialog" aria-label="Choisir une wilaya">
          <p className="wilaya-help">Facultatif : DALIL met en avant les lieux, services et sorties de cette wilaya. Aucune géolocalisation.</p>
          <input ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une wilaya" aria-label="Rechercher une wilaya" />
          <div className="wilaya-list" role="listbox" aria-label="Wilayas">
            {!q && (
              <button type="button" role="option" aria-selected={!current} onClick={() => choose(null)}>
                <span>Toute l’Algérie</span>
                {!current && <b>✓</b>}
              </button>
            )}
            {list.map((w) => (
              <button key={w.code} type="button" role="option" aria-selected={current?.code === w.code} onClick={() => choose(w.code)}>
                <small>{String(w.code).padStart(2, '0')}</small>
                <span>{w.name}</span>
                {current?.code === w.code && <b>✓</b>}
              </button>
            ))}
            {!list.length && <p className="wilaya-empty">Aucune wilaya ne correspond.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
