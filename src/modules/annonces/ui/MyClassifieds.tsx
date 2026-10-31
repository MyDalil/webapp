'use client'

import Link from '@/platform/ui/Link'
import { useEffect, useState } from 'react'
import type { Conversation, MyClassified } from '../market'

const day = (iso: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Africa/Algiers' }).format(new Date(iso))
const TONE: Record<string, string> = { pending: 'pending', published: 'ok', rejected: 'off', expired: 'off', closed: 'off' }

/** Espace membre : mes annonces (état, renouveler, retirer, modifier) et mes conversations. */
export function MyClassifieds() {
  const [data, setData] = useState<{ mine: MyClassified[]; conversations: Conversation[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = () =>
    fetch('/api/annonces', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { mine: [], conversations: [] }))
      .then(setData)
  useEffect(() => {
    load()
  }, [])

  async function act(id: number, action: 'renew' | 'close' | 'delete') {
    if (action === 'delete' && !confirm('Supprimer définitivement cette annonce et ses conversations ?')) return
    if (action === 'close' && !confirm('Retirer cette annonce (vendue, louée, pourvue) ?')) return
    setError(null)
    const r = await fetch(`/api/annonces/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) return setError(d.error ?? 'Action impossible.')
    load()
  }

  if (!data) return null
  return (
    <>
      <section className="account-block" id="annonces">
        <h2>Mes annonces</h2>
        {!data.mine.length ? (
          <p className="muted-line">
            Aucune annonce. <Link href="/annonces/deposer">Déposer une annonce</Link>
          </p>
        ) : (
          <ul className="rdv-list">
            {data.mine.map((a) => (
              <li key={a.id} className="rdv-item">
                <div className="rdv-when">
                  <b>{a.title}</b>
                  <span className={`mission-status is-${TONE[a.status] ?? 'off'}`}>{a.statusLabel}</span>
                </div>
                <div className="rdv-who">
                  <span>
                    {a.categoryLabel} · {a.subLabel} · {a.price}
                  </span>
                  {a.status === 'published' && a.expiresAt && <small>En ligne jusqu’au {day(a.expiresAt)}.</small>}
                  {a.status === 'pending' && <small>En cours de contrôle par l’équipe DALIL.</small>}
                  {a.rejectionReason && <small>Refusée : {a.rejectionReason}</small>}
                  {!!a.conversations && (
                    <small>
                      {a.conversations} conversation{a.conversations > 1 ? 's' : ''}
                      {a.unread ? ` · ${a.unread} message${a.unread > 1 ? 's' : ''} non lu${a.unread > 1 ? 's' : ''}` : ''}
                    </small>
                  )}
                </div>
                <div className="rdv-actions">
                  {a.status === 'published' && (
                    <Link className="button outline" href={a.href}>
                      Voir
                    </Link>
                  )}
                  {a.canRenew && (
                    <button type="button" className="button primary" onClick={() => act(a.id, 'renew')}>
                      Renouveler
                    </button>
                  )}
                  {a.status !== 'closed' && (
                    <Link className="button outline" href={`/annonces/deposer?modifier=${a.id}`}>
                      Modifier
                    </Link>
                  )}
                  {a.status === 'published' && (
                    <button type="button" className="button outline" onClick={() => act(a.id, 'close')}>
                      Retirer
                    </button>
                  )}
                  <button type="button" className="button outline" onClick={() => act(a.id, 'delete')}>
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="auth-msg error">{error}</p>}
      </section>
      {!!data.conversations.length && (
        <section className="account-block">
          <h2>Messagerie des annonces</h2>
          <ul className="rdv-list">
            {data.conversations.map((c) => (
              <li key={`${c.classified.id}-${c.buyerId}`} className="rdv-item">
                <div className="rdv-when">
                  <b>{c.other}</b>
                  {!!c.unread && <span className="mission-status is-pending">{c.unread} non lu{c.unread > 1 ? 's' : ''}</span>}
                </div>
                <div className="rdv-who">
                  <span>{c.classified.title}</span>
                  <small>
                    {c.role === 'seller' ? 'Vous êtes l’annonceur' : 'Vous êtes intéressé'} · {day(c.at)}
                  </small>
                </div>
                <div className="rdv-actions">
                  <Link className="button outline" href={c.role === 'seller' ? `/annonces/messagerie?annonce=${c.classified.id}&contact=${c.buyerId}` : `${c.classified.href}#contact`}>
                    Ouvrir
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
