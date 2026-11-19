'use client'
import { useState } from 'react'
import type { SectionNode } from '@/platform/controls/sections'

type Props = { tree: SectionNode[]; initialOff: string[]; initialMessage: string; defaultMessage: string; canEdit: boolean }

/** Interrupteurs de /admin/rubriques : appel de /api/rubriques (session de l’équipe), état mis à jour dès la réponse. */
export function RubriquesSwitches({ tree, initialOff, initialMessage, defaultMessage, canEdit }: Props) {
  const [off, setOff] = useState(() => new Set(initialOff))
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState(initialMessage)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function send(body: Record<string, unknown>, key: string) {
    setBusy(key)
    setMsg(null)
    try {
      const r = await fetch('/api/rubriques', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const out = (await r.json().catch(() => ({}))) as { error?: string; summary?: string; coupees?: string[] }
      if (!r.ok) setMsg({ ok: false, text: out.error ?? 'Action non effectuée.' })
      else {
        if (out.coupees) setOff(new Set(out.coupees))
        setMsg({ ok: true, text: out.summary ?? 'Fait.' })
      }
    } catch {
      setMsg({ ok: false, text: 'Réseau indisponible : réessayez.' })
    } finally {
      setBusy(null)
    }
  }

  const row = (key: string, label: string, sub: string | null, parentOff: boolean) => {
    const isOff = off.has(key)
    const on = !isOff && !parentOff
    return (
      <div className="ct-row rb-row" key={key}>
        <span>
          <i className={`ct-dot${on ? '' : ' is-alert'}`} aria-hidden="true" />
          {label}
          {sub ? <small className="rb-sub">{sub}</small> : null}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={!isOff}
          aria-label={`${label} : ${isOff ? 'coupée' : 'allumée'}`}
          className={`rb-switch${isOff ? '' : ' is-on'}`}
          disabled={!canEdit || busy !== null}
          data-key={key}
          onClick={() => send({ cle: key, coupe: !isOff }, key)}
        >
          <span className="rb-knob" aria-hidden="true" />
          <span className="rb-state">{isOff ? 'Coupée' : parentOff ? 'Coupée par la rubrique' : 'Allumée'}</span>
        </button>
      </div>
    )
  }

  return (
    <>
      <form
        className="rb-message"
        onSubmit={(e) => {
          e.preventDefault()
          send({ message }, 'message')
        }}
      >
        <label htmlFor="rb-msg">Message public (français)</label>
        <div className="vl-act">
          <input id="rb-msg" type="text" className="vl-note rb-input" maxLength={300} placeholder={defaultMessage} value={message} onChange={(e) => setMessage(e.target.value)} disabled={!canEdit || busy !== null} />
          <button type="submit" className="vl-btn" disabled={!canEdit || busy !== null}>Enregistrer</button>
        </div>
        <small>Vide = « {defaultMessage} ». Anglais et arabe : message par défaut.</small>
      </form>
      <p role="status" className={`vl-msg${msg && !msg.ok ? ' is-error' : ''}`} style={{ minHeight: '1.2em' }}>{msg?.text ?? ''}</p>
      <ul className="ct-list">
        {tree.map((n) => {
          const parentOff = Boolean(n.key) && off.has(n.key)
          return (
            <li key={n.key || n.label}>
              {n.key ? row(n.key, n.label, null, false) : <div className="ct-row rb-row"><b>{n.label}</b></div>}
              {n.categories.length ? (
                <details>
                  <summary>Catégories ({n.categories.length}{n.categories.some((c) => off.has(c.key)) ? ` · ${n.categories.filter((c) => off.has(c.key)).length} coupée(s)` : ''})</summary>
                  <div className="rb-cats">{n.categories.map((c) => row(c.key, c.label, c.sector, parentOff))}</div>
                </details>
              ) : null}
            </li>
          )
        })}
      </ul>
    </>
  )
}
