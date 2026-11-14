'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type Opt = { value: string; label: string }

/** Nouvelle tâche pour un agent (ou pour le CEO qui répartit). Créée avec la session : origine « équipe », auteur signé par le serveur. */
export function NewTaskForm({ agents, labels }: { agents: Opt[]; labels: Record<string, string> }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [agent, setAgent] = useState('')
  const [priority, setPriority] = useState('normal')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const ready = title.trim().length > 2 && instructions.trim().length > 2
  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready) return
    setError(null)
    const body: Record<string, unknown> = { title: title.trim(), instructions: instructions.trim(), priority, status: 'new' }
    if (agent) body.agent = Number(agent)
    const r = await fetch('/api/agent-tasks', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { errors?: Array<{ message?: string }> }
      setError(j.errors?.[0]?.message ?? `Erreur ${r.status}`)
      return
    }
    setTitle(''); setInstructions(''); setAgent('')
    start(() => router.refresh())
  }
  return (
    <form onSubmit={send} style={{ display: 'grid', gap: 8 }} aria-label={labels.form}>
      <input className="dl-inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={labels.title} aria-label={labels.title} maxLength={160} />
      <textarea className="dl-inp" rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder={labels.instructions} aria-label={labels.instructions} />
      <div className="dl-row dl-wr" style={{ gap: 8 }}>
        <select className="dl-inp" value={agent} onChange={(e) => setAgent(e.target.value)} aria-label={labels.agent} style={{ flex: '1 1 180px' }}>
          <option value="">{labels.ceo}</option>
          {agents.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <select className="dl-inp" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label={labels.priority} style={{ flex: '0 1 150px' }}>
          {['low', 'normal', 'high', 'urgent'].map((p) => <option key={p} value={p}>{labels[`prio.${p}`] ?? p}</option>)}
        </select>
        <button type="submit" className="dl-btn pri" disabled={!ready || pending}>{pending ? '…' : labels.send}</button>
      </div>
      {error ? <span role="alert" style={{ color: 'var(--dl-da)', fontSize: 12 }}>{error}</span> : null}
    </form>
  )
}

/** Zone de texte préremplie, enregistrée dans un champ (mémoire résumée d’un agent). */
export function FieldEditor({ path, field, value, label, save, rows = 5, dir }: { path: string; field: string; value: string; label: string; save: string; rows?: number; dir?: 'rtl' | 'ltr' }) {
  const router = useRouter()
  const [v, setV] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()
  const send = async () => {
    setError(null); setSaved(false)
    const r = await fetch(path, { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ [field]: v }) })
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { errors?: Array<{ message?: string }> }
      setError(j.errors?.[0]?.message ?? `Erreur ${r.status}`)
      return
    }
    setSaved(true)
    start(() => router.refresh())
  }
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <textarea className="dl-inp" rows={rows} dir={dir} value={v} onChange={(e) => { setV(e.target.value); setSaved(false) }} aria-label={label} />
      <div className="dl-row" style={{ gap: 8 }}>
        <button type="button" className="dl-btn" onClick={send} disabled={pending || v === value}>{pending ? '…' : save}</button>
        {saved ? <span className="dl-pill ok" role="status">✓</span> : null}
        {error ? <span role="alert" style={{ color: 'var(--dl-da)', fontSize: 12 }}>{error}</span> : null}
      </div>
    </div>
  )
}
