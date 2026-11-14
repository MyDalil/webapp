'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type Prepared = { key: string; label: string; text: string }

/** Réponse au demandeur : réponse préparée (à compléter), texte libre, statut après l’envoi. */
export function ReplyBox({ id, prepared, labels, statuses }: { id: number; prepared: Prepared[]; labels: Record<string, string>; statuses: Array<{ value: string; label: string }> }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true); setMsg(null)
    const r = await fetch('/api/boite/repondre', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, text, status: status || undefined }) })
    const j = (await r.json().catch(() => ({}))) as { error?: string; delivered?: boolean }
    setBusy(false)
    if (!r.ok) return setMsg({ ok: false, text: j.error ?? `Erreur ${r.status}` })
    setMsg({ ok: Boolean(j.delivered), text: j.delivered ? labels.sent : labels.notSent })
    setText('')
    start(() => router.refresh())
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <select className="dl-inp" value="" onChange={(e) => { const p = prepared.find((x) => x.key === e.target.value); if (p) setText(p.text) }} aria-label={labels.prepared}>
        <option value="">{labels.prepared}</option>
        {prepared.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
      <textarea className="dl-inp" rows={7} value={text} onChange={(e) => setText(e.target.value)} aria-label={labels.text} placeholder={labels.text} />
      <div className="dl-row dl-wr" style={{ gap: 8 }}>
        <select className="dl-inp" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={labels.status} style={{ flex: '1 1 200px' }}>
          <option value="">{labels.keep}</option>
          {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button type="button" className="dl-btn pri" onClick={send} disabled={busy || pending || text.trim().length < 2}>{busy ? '…' : labels.send}</button>
      </div>
      {msg ? <span role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'dl-pill ok' : 'dl-pill wa'} style={{ whiteSpace: 'normal' }}>{msg.text}</span> : null}
    </div>
  )
}
