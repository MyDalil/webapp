'use client'

import { useMemo, useState } from 'react'
import { Icon, IconLabel } from '@/platform/ui/Icon'
import { MicButton } from '@/platform/ui/MicButton'

export type Rep = { slug: string; name: string; country: string; city: string; kind: string; continent?: string | null; address?: string | null; phone?: string | null; email?: string | null; website?: string | null; jurisdiction?: string | null; onlineServices?: { title: string; url: string }[] | null }

const KIND: Record<string, string> = { ambassade: 'Ambassade', 'consulat-general': 'Consulat général', consulat: 'Consulat' }
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Ambassades et consulats d’Algérie : recherche par pays, ville ou région couverte ; un pays = un groupe. */
export function ConsulatFinder({ reps }: { reps: Rep[] }) {
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const w = norm(q.trim())
    return w ? reps.filter((r) => norm([r.country, r.city, r.name, r.jurisdiction ?? ''].join(' ')).includes(w)) : reps
  }, [q, reps])
  const byCountry = useMemo(() => {
    const m = new Map<string, Rep[]>()
    for (const r of shown) m.set(r.country, [...(m.get(r.country) ?? []), r])
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'))
  }, [shown])
  return (
    <div className="cs-finder">
      <label className="cs-search">
        <span className="sr-only">Pays, ville ou département</span>
        <Icon name="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pays, ville ou département (ex. France, Lyon, 69)" type="search" enterKeyHint="search" />
        <MicButton />
      </label>
      {!byCountry.length && <p className="sr-note">Aucun poste trouvé. Essayez le nom du pays.</p>}
      {byCountry.map(([country, list]) => (
        <section key={country} className="cs-country" aria-label={country}>
          <h2>{country}</h2>
          <ul className="cs-grid">
            {list.map((r) => (
              <li key={r.slug} id={r.slug} className="cs-card">
                <span className="cs-kind">{KIND[r.kind] ?? r.kind}</span>
                <h3>{r.name}</h3>
                {r.address && <p className="cs-line">{r.address}</p>}
                {r.jurisdiction && (
                  <p className="cs-line is-muted">
                    <b>Territoire :</b> {r.jurisdiction}
                  </p>
                )}
                <div className="cs-actions">
                  {r.website && (
                    <a className="sr-pill is-primary" href={r.website} target="_blank" rel="noopener noreferrer">
                      <IconLabel label="Site officiel ↗" icon="globe" />
                    </a>
                  )}
                  {r.phone && (
                    <a className="sr-pill" href={`tel:${r.phone.replace(/[^\d+]/g, '')}`}>
                      <IconLabel label={r.phone} icon="phone" />
                    </a>
                  )}
                  {r.email && (
                    <a className="sr-pill" href={`mailto:${r.email}`}>
                      <IconLabel label="Email" icon="mail" />
                    </a>
                  )}
                </div>
                {!!r.onlineServices?.length && (
                  <ul className="cs-online">
                    {r.onlineServices.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer">
                          {s.title} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
