'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

/**
 * Bouton d’action du cockpit : appel à l’API REST de Payload (droits de la session), puis rafraîchissement.
 * L’erreur renvoyée par le serveur (garde-fou, droit) s’affiche telle quelle sous le bouton.
 */
export function Act({ path, method = 'PATCH', body, label, className = 'dl-btn', confirm, disabled }: { path: string; method?: 'PATCH' | 'POST' | 'DELETE'; body?: unknown; label: string; className?: string; confirm?: string; disabled?: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const run = async () => {
    if (confirm && !window.confirm(confirm)) return
    setError(null)
    const r = await fetch(path, { method, credentials: 'include', headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { errors?: Array<{ message?: string }>; error?: string; detail?: string }
      setError(j.errors?.[0]?.message ?? j.error ?? j.detail ?? `Erreur ${r.status}`)
      return
    }
    start(() => router.refresh())
  }
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button type="button" className={className} onClick={run} disabled={disabled || pending} aria-busy={pending}>{pending ? '…' : label}</button>
      {error ? <span role="alert" className="dl-mu" style={{ color: 'var(--dl-da)', fontSize: 12, maxWidth: 260 }}>{error}</span> : null}
    </span>
  )
}

/** Petit formulaire (une zone de texte) qui envoie sa valeur dans `field`, avec des champs fixes en plus. */
export function TextAct({ path, method = 'PATCH', field, extra, label, placeholder, rows = 2 }: { path: string; method?: 'PATCH' | 'POST'; field: string; extra?: Record<string, unknown>; label: string; placeholder: string; rows?: number }) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const send = async () => {
    if (!value.trim()) return
    setError(null)
    const r = await fetch(path, { method, credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...extra, [field]: value.trim() }) })
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { errors?: Array<{ message?: string }>; error?: string }
      setError(j.errors?.[0]?.message ?? j.error ?? `Erreur ${r.status}`)
      return
    }
    setValue('')
    start(() => router.refresh())
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="dl-row" style={{ alignItems: 'stretch', gap: 8 }}>
        <textarea className="dl-inp" rows={rows} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} aria-label={placeholder} style={{ flex: 1, resize: 'vertical' }} />
        <button type="button" className="dl-btn pri" onClick={send} disabled={pending || !value.trim()}>{label}</button>
      </div>
      {error ? <span role="alert" style={{ color: 'var(--dl-da)', fontSize: 12 }}>{error}</span> : null}
    </div>
  )
}
