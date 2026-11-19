'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Op } from './validation'

type Props = { kind: string; id: number; ops: { op: Op; label: string }[]; withNote: boolean }

/** Boutons d’une ligne de la vue Validation : appel de /api/validation (session de l’équipe), puis rafraîchissement. */
export function ValidationActions({ kind, id, ops, withNote }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  async function go(op: Op) {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/validation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, id, op, note }) })
      const body = (await r.json().catch(() => ({}))) as { error?: string; summary?: string }
      if (!r.ok) setMsg({ ok: false, text: body.error ?? 'Action non effectuée.' })
      else {
        setMsg({ ok: true, text: body.summary ?? 'Fait.' })
        router.refresh()
      }
    } catch {
      setMsg({ ok: false, text: 'Réseau indisponible : réessayez.' })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="vl-act">
      {withNote ? <input type="text" className="vl-note" aria-label="Note ou motif" placeholder="Note ou motif (facultatif)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} /> : null}
      {ops.map(({ op, label }) => (
        <button key={op} type="button" className={`vl-btn${op === 'rejeter' ? ' is-secondary' : ''}`} disabled={busy} onClick={() => go(op)}>
          {label}
        </button>
      ))}
      {msg ? <span role="status" className={`vl-msg${msg.ok ? '' : ' is-error'}`}>{msg.text}</span> : null}
    </div>
  )
}
