'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { SECTORS, WILAYAS } from '@/platform/referentiel/catalog'
import { useWilaya } from './wilaya'
import { NavIcon } from './NavIcon'

/** Barre « Trouvez rapidement » des méga-menus : wilaya + catégorie + recherche → annuaire filtré. */
export function QuickFind({ onDone }: { onDone?: () => void }) {
  const router = useRouter()
  const chosen = useWilaya()
  const [wilaya, setWilaya] = useState('')
  const [sector, setSector] = useState('')
  const [q, setQ] = useState('')
  useEffect(() => setWilaya(chosen ? String(chosen.code) : ''), [chosen])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (wilaya) p.set('wilaya', wilaya)
    if (q.trim()) p.set('q', q.trim())
    const qs = p.toString()
    router.push(`/annuaire${sector ? `/${sector}` : ''}${qs ? `?${qs}` : ''}`)
    onDone?.()
  }
  return (
    <form className="quick-find" onSubmit={submit} role="search" aria-label="Trouvez rapidement">
      <p className="quick-find-title">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        Trouvez rapidement
      </p>
      <label className="quick-field">
        <span className="sr-only">Wilaya</span>
        <NavIcon name="pin" />
        <select value={wilaya} onChange={(e) => setWilaya(e.target.value)}>
          <option value="">Toutes les wilayas</option>
          {WILAYAS.map((w) => (
            <option key={w.code} value={w.code}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      <label className="quick-field">
        <span className="sr-only">Catégorie</span>
        <NavIcon name="grid" />
        <select value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {SECTORS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.title}
            </option>
          ))}
        </select>
      </label>
      <label className="quick-field quick-query">
        <span className="sr-only">Recherche</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Que recherchez-vous en Algérie ?" />
      </label>
      <button className="button primary quick-submit" type="submit">
        Rechercher
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  )
}
