'use client'

import Link from '@/platform/ui/Link'
import { useEffect, useMemo, useState } from 'react'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { useWilaya } from '@/platform/shell/wilaya'
import { EVENT_TYPES, selectWeekend, type WeekendFilters, type When } from '../weekend'
import type { EventCard, PlaceCard } from '../queries'

const TZ = 'Africa/Algiers'
const fmt = (iso: string | Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { ...o, timeZone: TZ }).format(new Date(iso))
const money = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} DA`
const TYPE = Object.fromEntries(EVENT_TYPES) as Record<string, string>
const WHEN: [When, string][] = [
  ['weekend', 'Ce week-end'],
  ['today', 'Aujourd’hui'],
  ['week', 'Cette semaine'],
  ['month', 'Ce mois-ci'],
  ['all', 'Toutes les dates'],
]

function dates(e: EventCard) {
  const same = !e.endsAt || fmt(e.startsAt, { dateStyle: 'short' }) === fmt(e.endsAt, { dateStyle: 'short' })
  const day = fmt(e.startsAt, { weekday: 'long', day: 'numeric', month: 'long' })
  const hour = fmt(e.startsAt, { hour: '2-digit', minute: '2-digit' })
  return same ? `${day} · ${hour}` : `Du ${fmt(e.startsAt, { day: 'numeric', month: 'long' })} au ${fmt(e.endsAt!, { day: 'numeric', month: 'long' })}`
}
const price = (e: EventCard) => (e.free ? 'Gratuit' : e.priceMin != null ? `À partir de ${money(e.priceMin)}` : 'Tarif à confirmer')

/** « Que faire ce week-end ? » : sélection et filtres (wilaya de l’en-tête par défaut). */
export function WeekendExplorer({ events, places }: { events: EventCard[]; places: PlaceCard[] }) {
  const chosen = useWilaya()
  const [f, setF] = useState<WeekendFilters>({ when: 'weekend' })
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])
  useEffect(() => {
    setF((x) => ({ ...x, wilaya: chosen?.code ?? null, distance: chosen ? x.distance || 'wilaya' : '' }))
  }, [chosen])
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('type')
    if (t && TYPE[t]) setF((x) => ({ ...x, type: t }))
  }, [])
  const set = (patch: Partial<WeekendFilters>) => setF((x) => ({ ...x, ...patch }))

  const r = useMemo(() => (now ? selectWeekend({ events, places, filters: f, now }) : null), [events, places, f, now])
  const total = r ? r.confirmed.length + r.incomplete.length : 0
  const sameDay = r && fmt(r.window.from, { dateStyle: 'short' }) === fmt(r.window.to, { dateStyle: 'short' })
  const range = r && f.when === 'weekend' ? (sameDay ? fmt(r.window.to, { weekday: 'long', day: 'numeric', month: 'long' }) : `${fmt(r.window.from, { weekday: 'long', day: 'numeric' })} – ${fmt(r.window.to, { weekday: 'long', day: 'numeric', month: 'long' })}`) : null

  return (
    <>
      <form className="we-filters" onSubmit={(e) => e.preventDefault()} aria-label="Filtres">
        <div className="we-when" role="radiogroup" aria-label="Quand">
          {WHEN.map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={f.when === v} onClick={() => set({ when: v })}>
              {l}
            </button>
          ))}
        </div>
        <div className="we-row">
          <label>
            Wilaya
            <select value={f.wilaya ?? ''} onChange={(e) => set({ wilaya: e.target.value ? Number(e.target.value) : null, distance: e.target.value ? f.distance || 'wilaya' : '' })}>
              <option value="">Toute l’Algérie</option>
              {WILAYAS.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Distance
            <select value={f.distance ?? ''} disabled={!f.wilaya} onChange={(e) => set({ distance: e.target.value as WeekendFilters['distance'] })}>
              <option value="">Toute l’Algérie</option>
              <option value="wilaya">Dans la wilaya</option>
              <option value="100">Jusqu’à 100 km</option>
              <option value="250">Jusqu’à 250 km</option>
            </select>
          </label>
          <label>
            Budget
            <select value={f.budget ?? ''} onChange={(e) => set({ budget: e.target.value as WeekendFilters['budget'] })}>
              <option value="">Tous les budgets</option>
              <option value="free">Gratuit</option>
              <option value="1000">Jusqu’à 1 000 DA</option>
              <option value="3000">Jusqu’à 3 000 DA</option>
            </select>
          </label>
          <label>
            Type d’activité
            <select value={f.type ?? ''} onChange={(e) => set({ type: e.target.value })}>
              <option value="">Toutes les activités</option>
              {EVENT_TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <div className="we-toggles" role="group" aria-label="Pour qui">
            <button type="button" aria-pressed={!!f.family} onClick={() => set({ family: !f.family })}>
              En famille
            </button>
            <button type="button" aria-pressed={!!f.accessible} onClick={() => set({ accessible: !f.accessible })}>
              Accessible en fauteuil
            </button>
          </div>
        </div>
      </form>

      <p className="we-count" aria-live="polite">
        {!r ? 'Chargement…' : `${total} événement${total > 1 ? 's' : ''}${range ? ` · ${range}` : ''}${chosen && f.distance ? ` · autour de ${chosen.name}` : ''}`}
      </p>

      {r && total === 0 && (
        <div className="praticiens-empty we-empty">
          <h2>Aucun événement publié pour ces critères.</h2>
          <p>DALIL n’affiche que des événements datés et sourcés. Élargissez les dates ou la distance, ou proposez un événement que vous connaissez.</p>
          <Link className="button outline" href="/proposer?type=evenement">
            Proposer un événement
          </Link>
        </div>
      )}

      {r && r.confirmed.length > 0 && (
        <section className="we-section" aria-labelledby="we-confirmed">
          <h2 id="we-confirmed">Au programme</h2>
          <ul className="we-list">
            {r.confirmed.map((e) => (
              <EventItem key={e.slug} e={e} />
            ))}
          </ul>
        </section>
      )}
      {r && r.incomplete.length > 0 && (
        <section className="we-section" aria-labelledby="we-incomplete">
          <h2 id="we-incomplete">À confirmer</h2>
          <p className="muted-line">Informations incomplètes : vérifiez la date et le lieu auprès de l’organisateur avant de vous déplacer.</p>
          <ul className="we-list">
            {r.incomplete.map((e) => (
              <EventItem key={e.slug} e={e} />
            ))}
          </ul>
        </section>
      )}

      {r && (
        <section className="we-section" aria-labelledby="we-places">
          <h2 id="we-places">Lieux à visiter</h2>
          {r.placesHidden ? (
            <p className="muted-line">Le prix, l’accueil des enfants et l’accessibilité des lieux ne sont pas encore vérifiés : nous ne les proposons pas avec ce filtre.</p>
          ) : r.places.length ? (
            <>
              <p className="muted-line">Ouverts selon leurs horaires, à confirmer avant de partir.</p>
              <ul className="we-places">
                {r.places.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/adresses/${p.slug}`} className="entry-link">
                      <span className="entry-img" style={{ backgroundImage: `url(${p.photo})` }} aria-hidden="true" />
                      <strong>{p.name}</strong>
                      <span className="entry-sub">
                        {p.category} · {p.city}
                      </span>
                    </Link>
                    {p.credit && <small className="entry-credit">{p.credit}</small>}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted-line">Aucun lieu de ce type dans cette zone pour l’instant.</p>
          )}
        </section>
      )}
    </>
  )
}

function EventItem({ e }: { e: EventCard }) {
  return (
    <li className={`we-event ${e.status === 'confirmed' ? '' : 'is-incomplete'}`}>
      <span className="we-event-img" style={e.photo ? { backgroundImage: `url(${e.photo})` } : undefined} aria-hidden="true" />
      <div className="we-event-body">
        <p className="we-event-when">{dates(e)}</p>
        <h3>{e.title}</h3>
        <p className="we-event-where">
          {e.city}
          {e.address ? ` · ${e.address}` : ''}
        </p>
        <ul className="we-tags">
          <li className="chip chip-plain">{TYPE[e.type] ?? e.type}</li>
          <li className="chip chip-plain">{price(e)}</li>
          {e.family && <li className="chip chip-plain">En famille</li>}
          {e.accessible === 'yes' && <li className="chip chip-plain">Accessible en fauteuil</li>}
          <li className={`chip ${e.status === 'confirmed' ? '' : 'chip-warn'}`}>{e.status === 'confirmed' ? 'Confirmé' : 'Informations incomplètes'}</li>
        </ul>
        {e.intro && <p className="we-event-intro">{e.intro}</p>}
        <p className="we-event-links">
          {e.bookingUrl && (
            <a className="button primary" href={e.bookingUrl} target="_blank" rel="noopener noreferrer">
              Réserver ↗
            </a>
          )}
          {e.placeSlug && (
            <Link className="button outline" href={`/adresses/${e.placeSlug}`}>
              Voir le lieu
            </Link>
          )}
          {e.sourceUrl && (
            <a className="button text" href={e.sourceUrl} target="_blank" rel="noopener noreferrer">
              Source ↗
            </a>
          )}
        </p>
        {(e.organizer || e.contributor || e.credit) && (
          <small className="we-event-meta">
            {[e.organizer && `Organisé par ${e.organizer}`, e.contributor && `Proposé par ${e.contributor}`, e.credit].filter(Boolean).join(' · ')}
          </small>
        )}
      </div>
    </li>
  )
}
