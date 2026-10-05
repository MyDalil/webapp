'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Icon } from './Icon'
import { SaveButton } from './SaveButton'
import type { Listing } from '@/content/listings'

type Sector = { slug: string; title: string }

/** Annuaire au format de la maquette : filtres, résultats, carte indicative. */
export function Directory({ listings, sectors, photos, initialSector = '' }: { listings: Listing[]; sectors: Sector[]; photos: Record<string, string>; initialSector?: string }) {
  const [q, setQ] = useState('')
  const [sector, setSector] = useState(initialSector)
  const [city, setCity] = useState('')
  const [order, setOrder] = useState<'relevance' | 'recent'>('relevance')
  const cities = useMemo(() => [...new Set(listings.map((l) => l.city))].sort(), [listings])

  const results = useMemo(() => {
    const n = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const needle = n(q.trim())
    const list = listings.filter(
      (l) => (!needle || n(`${l.name} ${l.category} ${l.city} ${l.place} ${l.sectorTitle}`).includes(needle)) && (!sector || l.sector === sector) && (!city || l.city === city),
    )
    return order === 'recent' ? [...list].sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? '')) : list
  }, [listings, q, sector, city, order])

  return (
    <section className="directory-shell container">
      <div className="filter-panel">
        <label>
          Recherche
          <div className="field-icon">
            <Icon name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="École, restaurant, médecin…" />
          </div>
        </label>
        <label>
          Secteur
          <select value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">Tous les secteurs</option>
            {sectors.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ville
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Toutes les villes</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Priorité
          <select value={order} onChange={(e) => setOrder(e.target.value as 'relevance' | 'recent')}>
            <option value="relevance">Les plus pertinents</option>
            <option value="recent">Les plus récents</option>
          </select>
        </label>
        <Link className="button primary wide" href="/proposer">
          Proposer une adresse
        </Link>
      </div>
      <div className="directory-results">
        <div className="results-toolbar">
          <div>
            <strong>
              {results.length} résultat{results.length > 1 ? 's' : ''}
            </strong>
            <small>Adresses repérées · critères DALIL en cours de vérification</small>
          </div>
        </div>
        <div className="place-list">
          {results.length ? (
            results.map((l) => (
              <article className="place-row" key={l.slug}>
                <div className="place-thumb" style={{ backgroundImage: `url(${photos[l.slug]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                <Link className="place-main" href={`/adresses/${l.slug}`}>
                  <span className="place-type">
                    {l.category} · {l.city}
                  </span>
                  <h3>{l.name}</h3>
                  <p>
                    {l.sectorTitle} · <b>À vérifier</b>
                  </p>
                </Link>
                <SaveButton itemType="listing" itemKey={l.slug} label={l.name} />
              </article>
            ))
          ) : (
            <div className="empty-state">
              <h3>Aucun résultat précis.</h3>
              <p>
                Élargissez vos filtres, <Link href="/recherche">demandez à DALIL</Link> ou <Link href="/proposer">proposez une adresse</Link>.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="map-panel" aria-label="Carte indicative">
        <div className="map-grid"></div>
        {results.slice(0, 5).map((l, i) => (
          <Link key={l.slug} className={`map-pin pin-${i + 1}`} href={`/adresses/${l.slug}`} aria-label={l.name}>
            <span>{i + 1}</span>
          </Link>
        ))}
        <div className="map-card">
          <strong>Carte indicative</strong>
          <small>Les positions exactes s’affichent après vérification de chaque adresse.</small>
        </div>
      </div>
    </section>
  )
}
