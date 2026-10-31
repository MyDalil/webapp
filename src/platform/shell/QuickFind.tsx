'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useLangRouter } from '@/platform/ui/lang'
import { SECTORS, WILAYAS } from '@/platform/referentiel/catalog'
import { useWilaya } from './wilaya'
import { NavIcon } from './NavIcon'
import { sectorTitle, shellText, type Lang } from '../i18n'

/** Barre « Trouvez rapidement » des méga-menus : wilaya + catégorie + recherche → annuaire filtré. */
export function QuickFind({ onDone, lang = 'fr' }: { onDone?: () => void; lang?: Lang }) {
  const t = shellText(lang)
  const router = useLangRouter()
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
    <form className="quick-find" onSubmit={submit} role="search" aria-label={t.quickFind}>
      <p className="quick-find-title">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        {t.quickFind}
      </p>
      <label className="quick-field">
        <span className="sr-only">{t.wilaya}</span>
        <NavIcon name="pin" />
        <select value={wilaya} onChange={(e) => setWilaya(e.target.value)}>
          <option value="">{t.allWilayas}</option>
          {WILAYAS.map((w) => (
            <option key={w.code} value={w.code}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      <label className="quick-field">
        <span className="sr-only">{t.category}</span>
        <NavIcon name="grid" />
        <select value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">{t.allCategories}</option>
          {SECTORS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {sectorTitle(s.title, lang)}
            </option>
          ))}
        </select>
      </label>
      <label className="quick-field quick-query">
        <span className="sr-only">{t.searchLabel}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.quickPlaceholder} />
      </label>
      <button className="button primary quick-submit" type="submit">
        {t.search}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  )
}
