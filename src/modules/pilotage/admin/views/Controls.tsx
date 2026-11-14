'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

async function patch(path: string, body: unknown) {
  const r = await fetch(path, { method: path.includes('/globals/') ? 'POST' : 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (r.ok) return null
  const j = (await r.json().catch(() => ({}))) as { errors?: Array<{ message?: string }>; error?: string }
  return j.errors?.[0]?.message ?? j.error ?? `Erreur ${r.status}`
}

function useSave() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const save = async (path: string, body: unknown) => {
    setError(null)
    const e = await patch(path, body)
    if (e) setError(e)
    else start(() => router.refresh())
  }
  return { save, error, pending }
}

const Err = ({ e }: { e: string | null }) => (e ? <p role="alert" style={{ color: 'var(--dl-da)', fontSize: 12, margin: '6px 0 0' }}>{e}</p> : null)

/** Arrêt général : 4 modes (réglage existant « Commandes »). */
export function KillSwitch({ mode, labels }: { mode: string; labels: Record<string, string> }) {
  const { save, error, pending } = useSave()
  return (
    <div>
      <div className="dl-seg" role="radiogroup" aria-label={labels.title} style={{ flexWrap: 'wrap' }}>
        {(['off', 'drain', 'stop', 'cut'] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={pending} onClick={() => save('/api/globals/controls', { killSwitch: m })}>{labels[m]}</button>
        ))}
      </div>
      <Err e={error} />
    </div>
  )
}

/** Interrupteur booléen d’un réglage global ou d’un document. */
export function Toggle({ path, field, value, label }: { path: string; field: string; value: boolean; label: string }) {
  const { save, error, pending } = useSave()
  return (
    <div>
      <button type="button" role="switch" aria-checked={value} disabled={pending} onClick={() => save(path, { [field]: !value })} className="dl-row dl-sb" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--dl-ln)', borderRadius: 12, background: 'none', color: 'var(--dl-tx)', cursor: 'pointer', font: 'inherit' }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
        <span aria-hidden="true" style={{ width: 40, height: 24, borderRadius: 99, background: value ? 'var(--dl-g)' : 'var(--dl-s3)', position: 'relative', flex: 'none' }}>
          <span style={{ position: 'absolute', top: 3, insetInlineStart: value ? 19 : 3, width: 18, height: 18, borderRadius: 99, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'inset-inline-start .15s' }} />
        </span>
      </button>
      <Err e={error} />
    </div>
  )
}

/** Montant en dollars (budget). Vide = aucun agent ne travaille (règle existante). */
export function Money({ path, field, value, label, hint }: { path: string; field: string; value: number | null; label: string; hint: string }) {
  const { save, error, pending } = useSave()
  const [v, setV] = useState(value == null ? '' : String(value))
  return (
    <div>
      <label className="lbl" style={{ display: 'block', fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>{label}</label>
      <div className="dl-row" style={{ gap: 8 }}>
        <input className="dl-inp" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} aria-label={label} style={{ maxWidth: 140 }} />
        <button type="button" className="dl-btn" disabled={pending} onClick={() => save(path, { [field]: v.trim() === '' ? null : Number(v.replace(',', '.')) })}>OK</button>
      </div>
      <p className="dl-mu" style={{ fontSize: 12, margin: '4px 0 0' }}>{hint}</p>
      <Err e={error} />
    </div>
  )
}

type ModeRow = { tool: string; mode: string }
/** Autonomie par outil d’un agent (Neon `toolModes`) : changement en un clic, sans déploiement. */
export function ToolModes({ agentId, tools, modes, labels }: { agentId: number; tools: Array<{ value: string; label: string; def: string }>; modes: ModeRow[]; labels: Record<string, string> }) {
  const { save, error, pending } = useSave()
  const current = Object.fromEntries(modes.map((m) => [m.tool, m.mode]))
  const set = (tool: string, mode: string) => {
    const next = { ...current, [tool]: mode }
    if (mode === 'default') delete next[tool]
    save(`/api/agents/${agentId}`, { toolModes: Object.entries(next).map(([t, m]) => ({ tool: t, mode: m })) })
  }
  return (
    <div className="dl-scroll">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 460 }}>
        <tbody>
          {tools.map((t) => {
            const m = current[t.value] ?? 'default'
            return (
              <tr key={t.value}>
                <th scope="row" style={{ textAlign: 'start', fontWeight: 500, padding: '7px 0', borderTop: '1px solid var(--dl-ln)' }}>{t.label}</th>
                <td style={{ padding: '5px 0', borderTop: '1px solid var(--dl-ln)', textAlign: 'end' }}>
                  <div className="dl-seg" role="radiogroup" aria-label={t.label}>
                    {(['default', 'execute', 'propose', 'forbidden'] as const).map((k) => (
                      <button key={k} type="button" role="radio" aria-checked={m === k} disabled={pending} onClick={() => set(t.value, k)}>{k === 'default' ? `${labels.default} (${labels[t.def]})` : labels[k]}</button>
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <Err e={error} />
    </div>
  )
}

/** Canaux de notification par moment (Commandes › Notifications). */
export function NotifyMatrix({ value, labels }: { value: Record<string, string[]>; labels: Record<string, string> }) {
  const { save, error, pending } = useSave()
  const phases = ['before', 'during', 'after', 'order'] as const
  const chans = ['admin', 'telegram_said', 'telegram_rad', 'email'] as const
  const flip = (p: string, c: string) => {
    const cur = new Set(value[p] ?? [])
    if (cur.has(c)) cur.delete(c)
    else cur.add(c)
    save('/api/globals/controls', { notifications: { ...value, [p]: [...cur] } })
  }
  return (
    <div className="dl-scroll">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 460 }}>
        <thead><tr><th scope="col" style={{ textAlign: 'start', color: 'var(--dl-mu)', fontWeight: 600, padding: 6 }}>{labels.moment}</th>{chans.map((c) => <th key={c} scope="col" style={{ color: 'var(--dl-mu)', fontWeight: 600, padding: 6 }}>{labels[c]}</th>)}</tr></thead>
        <tbody>
          {phases.map((p) => (
            <tr key={p}>
              <th scope="row" style={{ textAlign: 'start', padding: 6, borderTop: '1px solid var(--dl-ln)' }}>{labels[p]}</th>
              {chans.map((c) => (
                <td key={c} style={{ textAlign: 'center', padding: 6, borderTop: '1px solid var(--dl-ln)' }}>
                  <input type="checkbox" checked={c === 'admin' || (value[p] ?? []).includes(c)} disabled={pending || c === 'admin'} onChange={() => flip(p, c)} aria-label={`${labels[p]} · ${labels[c]}`} style={{ width: 18, height: 18, accentColor: 'var(--dl-g)' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Err e={error} />
    </div>
  )
}
