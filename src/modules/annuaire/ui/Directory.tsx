'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Icon } from '@/platform/ui/Icon'
import { SaveButton } from '@/modules/membres/ui'
import type { PlaceCard } from '../queries'
import { LANGUAGES } from '@/platform/referentiel/languages'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { useWilaya } from '@/platform/shell/wilaya'
import { filterPlaces, verifiedCriteria } from '../filters'

const DirectoryMap = dynamic(() => import('./DirectoryMap').then((m) => m.DirectoryMap), { ssr: false })

type Sector = { slug: string; title: string; categories: string[] }

const STATUS: Record<PlaceCard['status'], string> = {
  spotted: 'À vérifier',
  checking: 'En vérification',
  verified: 'Vérifiée',
  labelled: 'Label Excellence',
}

/** Annuaire au format de la maquette : filtres, résultats, carte. Données : collection « Adresses » (Neon). */
export function Directory({ places: initial, total: initialTotal, sectors, initialSector = '', lockSector = false, initialCategory = '', initialWilaya = '' }: { places: PlaceCard[]; total?: number; sectors: Sector[]; initialSector?: string; lockSector?: boolean; initialCategory?: string; initialWilaya?: string }) {
  // Fiches reçues du serveur pour le périmètre courant (secteur, spécialité, wilaya, texte) ; les autres filtres s’appliquent ici.
  const [places, setPlaces] = useState(initial)
  const [total, setTotal] = useState(initialTotal ?? initial.length)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [sector, setSector] = useState(initialSector)
  const [category, setCategory] = useState(initialCategory)
  const [city, setCity] = useState('')
  const [status, setStatus] = useState('')
  const [language, setLanguage] = useState('')
  const [order, setOrder] = useState<'relevance' | 'recent'>('relevance')
  const [wilaya, setWilayaFilter] = useState(initialWilaya)
  const [theme, setTheme] = useState<'nature' | ''>('')
  const [favorite, setFavorite] = useState(false)
  const [criteria, setCriteria] = useState<string[]>([])
  const chosen = useWilaya()
  // Wilaya imposée par le lien ou choisie ici : la wilaya de l’en-tête ne l’écrase plus (ref lue dans le même rendu).
  const pinned = useRef(Boolean(initialWilaya))

  // Liens des menus et des cartes : ?category=…, ?theme=nature, ?wilaya=<code ou nom>, ?q=…, ?ville=…
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const c = params.get('category')
    if (c) setCategory(c)
    if (params.get('theme') === 'nature') setTheme('nature')
    if (params.get('coeur') === '1') setFavorite(true)
    const w = params.get('wilaya')
    const named = w ? (WILAYAS.find((x) => String(x.code) === w || x.name === w)?.name ?? '') : ''
    if (named) {
      pinned.current = true
      setWilayaFilter(named)
    }
    const text = params.get('q') ?? params.get('ville')
    if (text) setQ(text)
  }, [])
  // Wilaya de l’en-tête : appliquée par défaut, modifiable ici (sauf si le lien en impose une).
  useEffect(() => {
    if (!pinned.current) setWilayaFilter(chosen?.name ?? '')
  }, [chosen])

  // Périmètre serveur : relu à chaque changement de secteur, spécialité, wilaya, coups de cœur ou recherche (après 350 ms de pause).
  const scope = JSON.stringify({ sector, category, wilaya, q: q.trim(), favorite })
  const firstScope = useRef(scope)
  useEffect(() => {
    if (scope === firstScope.current) return
    firstScope.current = ''
    const ctrl = new AbortController()
    const t = window.setTimeout(async () => {
      setLoading(true)
      const p = new URLSearchParams()
      if (sector) p.set('sector', sector)
      if (category) p.set('category', category)
      if (wilaya) p.set('wilaya', wilaya)
      if (q.trim()) p.set('q', q.trim())
      if (favorite) p.set('coeur', '1')
      try {
        const res = await fetch(`/api/annuaire?${p}`, { signal: ctrl.signal })
        if (res.ok) {
          const data = (await res.json()) as { places: PlaceCard[]; total: number }
          setPlaces(data.places)
          setTotal(data.total)
        }
      } catch {
        /* recherche annulée ou hors ligne : on garde la liste affichée */
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => {
      ctrl.abort()
      window.clearTimeout(t)
    }
  }, [scope]) // eslint-disable-line react-hooks/exhaustive-deps

  const scoped = useMemo(() => filterPlaces(places, { sector, wilaya }), [places, sector, wilaya])
  const wilayas = useMemo(() => WILAYAS.filter((w) => !w.transition).map((w) => w.name).sort((a, b) => a.localeCompare(b, 'fr')), [])
  const cities = useMemo(() => [...new Set(scoped.map((p) => p.city))].sort((a, b) => a.localeCompare(b, 'fr')), [scoped])
  const categories = useMemo(() => {
    const fromSector = sectors.find((s) => s.slug === sector)?.categories ?? []
    return [...new Set([...fromSector, ...scoped.map((p) => p.category)])]
  }, [sectors, sector, scoped])

  const results = useMemo(() => {
    const list = filterPlaces(scoped, { q, category, theme, city, status, language, favorite, criteria })
    return order === 'recent' ? [...list].sort((a, b) => b.updated.localeCompare(a.updated)) : list
  }, [scoped, q, category, theme, city, status, order, language, favorite, criteria])

  // Valeurs DALIL en tête (espace de prière, sans alcool, non-mixité), puis l’ordre alphabétique.
  const FIRST = ['Espace de prière', 'Sans alcool', 'Espace femmes', 'Horaires hommes / femmes', 'Piscine non mixte']
  const checkable = useMemo(() => verifiedCriteria(scoped).sort((a, b) => (FIRST.includes(b) ? 1 : 0) - (FIRST.includes(a) ? 1 : 0)), [scoped])
  const verified = results.filter((p) => p.status === 'verified' || p.status === 'labelled').length

  return (
    <section className="directory-shell container">
      <div className="filter-panel">
        <label>
          Recherche
          <div className="field-icon">
            <Icon name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, lieu, métier…" />
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
          Wilaya
          <select
            value={wilaya}
            onChange={(e) => {
              pinned.current = true
              setWilayaFilter(e.target.value)
              setCity('')
            }}
          >
            <option value="">Toutes les wilayas</option>
            {(wilaya && !wilayas.includes(wilaya) ? [wilaya, ...wilayas] : wilayas).map((w) => (
              <option key={w}>{w}</option>
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
        {checkable.length > 0 && (
          <fieldset className="criteria-filter">
            <legend>Critères vérifiés par DALIL</legend>
            {checkable.map((c) => (
              <button key={c} type="button" className="chip-toggle" aria-pressed={criteria.includes(c)} onClick={() => setCriteria(criteria.includes(c) ? criteria.filter((x) => x !== c) : [...criteria, c])}>
                {c}
              </button>
            ))}
          </fieldset>
        )}
        <label>
          Langue parlée
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="">Toutes les langues</option>
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
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
            <strong aria-live="polite">
              {loading ? 'Recherche…' : `${results.length} résultat${results.length > 1 ? 's' : ''}`}
            </strong>
            {total > places.length && <small>Les {places.length} mieux classés sur {total.toLocaleString('fr-FR')} : précisez la wilaya ou la spécialité.</small>}
            <small>{verified ? `${verified} vérifiée${verified > 1 ? 's' : ''} par DALIL` : 'Adresses repérées · critères DALIL en cours de vérification'}</small>
          </div>
          {(theme || wilaya || favorite) && (
            <div className="active-filters" aria-label="Filtres actifs">
              {favorite && (
                <button type="button" className="chip chip-remove" onClick={() => setFavorite(false)} aria-label="Retirer le filtre Coups de cœur">
                  Coups de cœur ×
                </button>
              )}
              {theme === 'nature' && (
                <button type="button" className="chip chip-remove" onClick={() => setTheme('')} aria-label="Retirer le filtre Nature & Espaces">
                  Nature &amp; Espaces ×
                </button>
              )}
              {wilaya && (
                <button
                  type="button"
                  className="chip chip-remove"
                  onClick={() => {
                    pinned.current = true
                    setWilayaFilter('')
                  }}
                  aria-label={`Retirer le filtre ${wilaya}`}
                >
                  {wilaya} ×
                </button>
              )}
            </div>
          )}
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
              <h3>{category ? `Pas encore de fiche « ${category} » ici.` : places.length ? 'Aucun résultat précis.' : 'La sélection se prépare.'}</h3>
              <p>
                Élargissez vos filtres, <Link href="/recherche">demandez à DALIL</Link> ou <Link href="/proposer">proposez une adresse</Link>.
              </p>
              {/* Jamais une liste vide (décision de Rad, 2026-10-26) : d’autres adresses réelles de la même rubrique. */}
              {!!places.length && (
                <div className="empty-fallback">
                  <p>
                    <b>Dans la même rubrique :</b>
                  </p>
                  <ul>
                    {(scoped.length ? scoped : places)
                      .filter((p) => p.category !== category)
                      .slice(0, 6)
                      .map((p) => (
                        <li key={p.slug}>
                          <Link href={`/adresses/${p.slug}`}>{p.name}</Link>
                          <small>
                            {p.category} · {p.city}
                          </small>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
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
