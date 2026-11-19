'use client'

import { useState } from 'react'
import Link from '@/platform/ui/Link'
import { useLang } from '@/platform/ui/lang'
import { PROOF_LABEL, PROOF_TYPES, proofFileError, type ClaimTarget, type ProofType } from './parcours'
import { t } from './t'

/** Revendication d’une fiche : justificatif (texte et fichier facultatif), décision par l’équipe, suivi dans l’espace pro. */
export function ClaimForm({ collection, slug, loggedIn }: { collection: ClaimTarget; slug: string; loggedIn: boolean }) {
  const lang = useLang()
  const [proof, setProof] = useState<ProofType>('telephone')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  if (!loggedIn)
    return (
      <div className="button-row">
        <Link className="button primary" href={`/connexion/professionnel?next=${encodeURIComponent(`/revendiquer/${collection}/${slug}`)}`}>
          {t('Se connecter pour revendiquer', lang)}
        </Link>
      </div>
    )

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const file = form.get('file')
    const bad = file && typeof file !== 'string' && file.size ? proofFileError(file) : null
    if (bad) return setMsg({ type: 'error', text: bad })
    form.set('targetCollection', collection)
    form.set('slug', slug)
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/pro/revendication', { method: 'POST', body: form })
      const d = (await r.json().catch(() => ({}))) as { message?: string; error?: string }
      setMsg(r.ok ? { type: 'ok', text: d.message ?? '' } : { type: 'error', text: d.error ?? t('Erreur réseau. Réessayez.', lang) })
    } catch {
      setMsg({ type: 'error', text: t('Erreur réseau. Réessayez.', lang) })
    } finally {
      setBusy(false)
    }
  }

  if (msg?.type === 'ok')
    return (
      <section className="account-block">
        <p className="auth-msg ok">{msg.text}</p>
        <div className="button-row">
          <Link className="button primary" href="/espace-pro#revendications">
            {t('Mon espace pro', lang)}
          </Link>
        </div>
      </section>
    )

  return (
    <form className="auth-form pro-form" onSubmit={submit}>
      <div className="auth-row">
        <label>
          {t('Justificatif', lang)}
          <select name="proofType" value={proof} onChange={(e) => setProof(e.target.value as ProofType)}>
            {PROOF_TYPES.map((p) => (
              <option key={p} value={p}>
                {t(p === 'telephone' ? 'Téléphone professionnel affiché sur la fiche' : PROOF_LABEL[p], lang)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t(proof === 'telephone' ? 'Téléphone professionnel' : 'Numéro ou précision', lang)}
          <input name="proofText" required={proof === 'telephone'} maxLength={300} type={proof === 'telephone' ? 'tel' : 'text'} inputMode={proof === 'telephone' ? 'tel' : undefined} dir={proof === 'telephone' ? 'ltr' : undefined} />
        </label>
      </div>
      <label className="doc-upload">
        <small>{t('Fichier (facultatif) — PDF, JPG ou PNG, 5 Mo au plus. Visible par l’équipe seulement.', lang)}</small>
        <input name="file" type="file" accept="application/pdf,image/jpeg,image/png" />
      </label>
      <p className="muted-line">{t('La revendication est gratuite et ne change jamais le statut de vérification de la fiche.', lang)}</p>
      {msg && <p className={`auth-msg ${msg.type}`}>{msg.text}</p>}
      <button className="button primary auth-submit" disabled={busy}>
        {busy ? t('Envoi…', lang) : t('Envoyer ma demande', lang)}
      </button>
    </form>
  )
}
