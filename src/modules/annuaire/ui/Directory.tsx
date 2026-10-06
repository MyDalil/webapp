'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Icon } from '@/platform/ui/Icon'
import { SaveButton } from '@/modules/membres/ui'
import type { PlaceCard } from '../queries'

const DirectoryMap = dynamic(() => import('./DirectoryMap').then((m) => m.DirectoryMap), { ssr: false })

type Sector = { slug: string; title: string; categories: string[] }

const STATUS: Record<PlaceCard['status'], string> = {
  spotted: 'À vérifier',
  checking: 'En vérification',
  verified: 'Vérifiée',
  labelled: 'Label Excellence',
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Annuaire au format de la maquette : filtres, résultats, carte. Données : collection « Adresses » (Neon). */
export function Directory({ places, sectors, initialSector = '', lockSector = false }: { places: PlaceCard[]; sectors: Sector[]; initialSector?: string; lockSector?: boolean }) {
  const [q, setQ] = useState('')
  const [sector, setSector] = useState(initialSector)
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [status, setStatus] = useState('')
  const [order, setOrder] = useState<'relevance' | 'recent'>('relevance')

  // Liens « catégorie » des cartes secteurs : /annuaire/<secteur>?category=…
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('category')
    if (c) setCategory(c)
  }, [])

  const scoped = useMemo(() => places.filter((p) => !sector || p.sector === sector), [places, sector])
  const cities = useMemo(() => [...new Set(scoped.map((p) => p.city))].sort((a, b) => a.localeCompare(b, 'fr')), [scoped])
  const categories = useMemo(() => {
    const fromSector = sectors.find((s) => s.slug === sector)?.categories ?? []
    return [...new Set([...fromSector, ...scoped.map((p) => p.category)])]
  }, [sectors, sector, scoped])

  const results = useMemo(() => {
    const needle = norm(q.trim())
    const list = scoped.filter(
      (p) =>
        (!needle || norm(`${p.name} ${p.category} ${p.city} ${p.place} ${p.sectorTitle} ${p.wilaya ?? ''}`).includes(needle)) &&
        (!category || p.category === category) &&
        (!city || p.city === city) &&
        (!status || p.status === status),
    )
    return order === 'recent' ? [...list].sort((a, b) => b.updated.localeCompare(a.updated)) : list
  }, [scoped, q, category, city, status, order])

  const verified = results.filter((p) => p.status === 'verified' || p.status === 'labelled').length

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
        {!lockSector && (
          <label>
            Secteur
            <select
              value={sector}
              onChange={(e) => {
                setSector(e.target.value)
                setCategory('')
                setCity('')
              }}
            >
              <option value="">Tous les secteurs</option>
              {sectors.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {sector && categories.length > 0 && (
          <label>
            Spécialité
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Toutes les spécialités</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
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
          Vérification
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priorité
          <select value={order} onChange={(e) => setOrder(e.target.value as 'relevance' | 'recent')}>
            <option value="relevance">Les plus pertinents</option>
            <option value="recent">Mises à jour récentes</option>
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
            <small>{verified ? `${verified} vérifiée${verified > 1 ? 's' : ''} par DALIL` : 'Adresses repérées · critères DALIL en cours de vérification'}</small>
          </div>
        </div>
        <div className="place-list">
          {results.length ? (
            results.map((p) => (
              <article className="place-row" key={p.slug}>
                <div className="place-thumb" style={{ backgroundImage: `url(${p.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                <Link className="place-main" href={`/adresses/${p.slug}`}>
                  <span className="place-type">
                    {p.category} · {p.city}
                  </span>
                  <h3>{p.name}</h3>
                  <p>
                    {p.sectorTitle} · <b className={`status-${p.status}`}>{STATUS[p.status]}</b>
                  </p>
                </Link>
                <SaveButton itemType="listing" itemKey={p.slug} label={p.name} />
              </article>
            ))
          ) : (
            <div className="empty-state">
              <h3>{places.length ? 'Aucun résultat précis.' : 'La sélection se prépare.'}</h3>
              <p>
                Élargissez vos filtres, <Link href="/recherche">demandez à DALIL</Link> ou <Link href="/proposer">proposez une adresse</Link>.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="map-panel" aria-label="Carte des adresses">
        <DirectoryMap places={results} />
        <div className="map-card">
          <strong>Carte</strong>
          <small>
            {results.some((p) => p.pos && !p.exact)
              ? 'Les repères clairs indiquent une position approximative (centre de la ville), en attendant la vérification sur place.'
              : 'Cliquez sur un repère pour ouvrir la fiche.'}
          </small>
        </div>
      </div>
    </section>
  )
}
