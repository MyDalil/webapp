'use client'

import { useState } from 'react'

/** Signaler une annonce : arnaque, contenu interdit, déjà vendue. Transmis à l’équipe DALIL. */
export function ReportForm({ id }: { id: number }) {
  const [reason, setReason] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('busy')
    const r = await fetch(`/api/annonces/${id}/signaler`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason }) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      setState('idle')
      return setError(d.error ?? 'Envoi impossible.')
    }
    setState('done')
  }
  if (state === 'done') return <p className="muted-line">Merci. L’équipe DALIL examine ce signalement.</p>
  return (
    <details className="classified-report">
      <summary>Signaler cette annonce</summary>
      <form onSubmit={submit} className="auth-form">
        <label>
          Le problème
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={3} required minLength={5} placeholder="Arnaque, paiement demandé d’avance, contenu interdit, déjà vendue…" />
        </label>
        {error && <p className="auth-msg error">{error}</p>}
        <button className="button outline" disabled={state === 'busy'}>
          Envoyer le signalement
        </button>
      </form>
    </details>
  )
}
