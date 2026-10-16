'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { MissionView } from '../marketplace'

const TZ = 'Africa/Algiers'
const fmt = (iso: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(iso))
const STATUS: Record<string, string> = { requested: 'En attente', accepted: 'Acceptée', declined: 'Déclinée', expired: 'Sans réponse', cancelled: 'Annulée', completed: 'Terminée' }

/** Liste de missions, côté client ou côté prestataire. */
export function MissionList({ items, empty }: { items: MissionView[]; empty?: React.ReactNode }) {
  if (!items.length) return <p className="muted-line">{empty ?? 'Aucune mission.'}</p>
  return (
    <ul className="rdv-list">
      {items.map((m) => (
        <li key={m.id} className={`rdv-item mission-${m.status}`}>
          <div className="rdv-when">
            <b>{fmt(m.start)}</b>
            <span className={`mission-status is-${m.status === 'accepted' || m.status === 'completed' ? 'ok' : m.status === 'requested' ? 'pending' : 'off'}`}>{STATUS[m.status] ?? m.status}</span>
          </div>
          <div className="rdv-who">
            <b>{m.activityLabel}</b>
            <span>
              {m.role === 'client' ? m.provider.name : m.client.name} · {m.communeName} · {m.hours} h{m.estimate ? ` · ≈ ${m.estimate}` : ''}
            </span>
            {m.canReview && <small>Donnez votre avis sur cette mission.</small>}
            {m.canAccept && <small>À accepter ou décliner.</small>}
          </div>
          <div className="rdv-actions">
            <Link className="button outline" href={`/missions/${m.id}`}>
              {m.canAccept ? 'Répondre' : 'Ouvrir'}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Espace client : demandes en cours et missions passées. */
export function MyMissions() {
  const [items, setItems] = useState<MissionView[] | null>(null)
  useEffect(() => {
    fetch('/api/services/missions', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { missions: [] }))
      .then((d) => setItems(d.missions))
  }, [])
  if (!items) return null
  const active = items.filter((m) => m.status === 'requested' || m.status === 'accepted' || m.canReview)
  const past = items.filter((m) => !active.includes(m))
  return (
    <>
      <section className="account-block">
        <h2>Mes demandes de service</h2>
        <MissionList
          items={active}
          empty={
            <>
              Aucune demande en cours. <Link href="/services">Trouver un prestataire</Link>
            </>
          }
        />
      </section>
      {!!past.length && (
        <section className="account-block">
          <h2>Services passés</h2>
          <MissionList items={past} />
        </section>
      )}
    </>
  )
}
