'use client'

import { useState } from 'react'
import { useLang } from '@/platform/ui/lang'
import { formatPrice, planPrice, RECEIPT_LABEL, RECEIPT_METHODS, proofFileError, type Currency, type Period, type PlanCode, type Pricing } from './parcours'
import { t } from './t'

type Target = { collection: string; id: number; name: string }

/**
 * Choix de la formule : fiche, formule, mensuel ou annuel (12 − mois offerts), devise ; paiement en ligne
 * (Chargily en DZD, Stripe en EUR) ou reçu (BaridiMob, CCP, virement). Prix absent → « Tarif sur demande ».
 * L’abonnement reste « en attente » jusqu’à la validation de l’équipe.
 */
export function PlanPicker({ targets, pricing, free, initialTarget }: { targets: Target[]; pricing: Pricing | null; free: number; initialTarget?: string }) {
  const lang = useLang()
  const plans = (pricing?.plans ?? []).filter((p) => p.code === 'pro' || p.code === 'premium')
  const [target, setTarget] = useState(initialTarget && targets.some((x) => `${x.collection}:${x.id}` === initialTarget) ? initialTarget : targets[0] ? `${targets[0].collection}:${targets[0].id}` : '')
  const [plan, setPlan] = useState<PlanCode>(plans[0]?.code ?? 'pro')
  const [period, setPeriod] = useState<Period>('annuel')
  const [currency, setCurrency] = useState<Currency>(lang === 'fr' || lang === 'ar' ? 'DZD' : 'EUR')
  const [mode, setMode] = useState<'en_ligne' | 'recu'>('recu')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const price = planPrice(pricing, plan, period, currency)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const file = form.get('file')
    const bad = file && typeof file !== 'string' && file.size ? proofFileError(file) : null
    if (bad) return setMsg({ type: 'error', text: bad })
    const [collection, id] = target.split(':')
    form.set('targetCollection', collection)
    form.set('targetId', id)
    form.set('plan', plan)
    form.set('period', period)
    form.set('currency', currency)
    form.set('mode', price == null ? 'sur_demande' : mode)
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/pro/abonnement', { method: 'POST', body: form })
      const d = (await r.json().catch(() => ({}))) as { message?: string; error?: string; url?: string }
      if (r.ok && d.url) return void window.location.assign(d.url)
      setMsg(r.ok ? { type: 'ok', text: d.message ?? t('En attente de validation', lang) } : { type: 'error', text: d.error ?? t('Erreur réseau. Réessayez.', lang) })
    } catch {
      setMsg({ type: 'error', text: t('Erreur réseau. Réessayez.', lang) })
    } finally {
      setBusy(false)
    }
  }

  if (msg?.type === 'ok')
    return (
      <div className="pro-status pro-pending">
        <b>{t('En attente de validation', lang)}</b>
        <span>{msg.text}</span>
      </div>
    )

  return (
    <form className="auth-form pro-form" onSubmit={submit}>
      <label>
        {t('Fiche', lang)}
        <select value={target} onChange={(e) => setTarget(e.target.value)} required>
          {targets.map((x) => (
            <option key={`${x.collection}:${x.id}`} value={`${x.collection}:${x.id}`}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>{t('Formule', lang)}</legend>
        <div className="auth-tabs pro-tabs" role="radiogroup" aria-label={t('Formule', lang)}>
          {(['mensuel', 'annuel'] as const).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => setPeriod(p)}>
              {t(p === 'mensuel' ? 'Mensuel' : 'Annuel', lang)}
              {p === 'annuel' && free > 0 ? ` · ${free} ${t('mois offerts', lang)}` : ''}
            </button>
          ))}
          {(['DZD', 'EUR'] as const).map((c) => (
            <button key={c} type="button" role="radio" aria-checked={currency === c} onClick={() => setCurrency(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="auth-choice">
          {(plans.length ? plans : [{ code: 'pro' as const, label: 'Pro', features: [] }, { code: 'premium' as const, label: 'Premium', features: [] }]).map((p) => {
            const v = planPrice(pricing, p.code, period, currency)
            return (
              <button key={p.code} type="button" className="auth-card" aria-pressed={plan === p.code} onClick={() => setPlan(p.code)}>
                <span className="auth-card-kicker">{p.label || (p.code === 'premium' ? 'Premium' : 'Pro')}</span>
                <b>{v == null ? t('Tarif sur demande', lang) : `${formatPrice(v, currency, lang)} ${t(period === 'annuel' ? '/ an' : '/ mois', lang)}`}</b>
                {(p.features ?? []).map((f, i) => {
                  const text = typeof f === 'string' ? f : f?.text
                  return text ? <span key={i}>{text}</span> : null
                })}
              </button>
            )
          })}
        </div>
      </fieldset>
      {price != null && (
        <fieldset>
          <legend>{t('Paiement', lang)}</legend>
          <div className="auth-tabs pro-tabs" role="radiogroup" aria-label={t('Paiement', lang)}>
            <button type="button" role="radio" aria-checked={mode === 'en_ligne'} onClick={() => setMode('en_ligne')}>
              {t('Payer en ligne', lang)} · {currency === 'DZD' ? 'Chargily' : 'Stripe'}
            </button>
            <button type="button" role="radio" aria-checked={mode === 'recu'} onClick={() => setMode('recu')}>
              {t('Envoyer un reçu', lang)}
            </button>
          </div>
          {mode === 'recu' && (
            <>
              <div className="auth-row">
                <label>
                  {t('Moyen de paiement', lang)}
                  <select name="method" required defaultValue="baridimob">
                    {RECEIPT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {RECEIPT_LABEL[m]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('Référence de la transaction', lang)}
                  <input name="reference" required maxLength={80} dir="ltr" />
                </label>
              </div>
              <label className="doc-upload">
                <small>{t('Reçu (PDF, JPG ou PNG, 5 Mo au plus)', lang)}</small>
                <input name="file" type="file" required accept="application/pdf,image/jpeg,image/png" />
              </label>
            </>
          )}
        </fieldset>
      )}
      <p className="muted-line">{t('Un abonnement apporte la mention « Partenaire » ; il n’achète jamais la vérification.', lang)}</p>
      {msg && <p className={`auth-msg ${msg.type}`}>{msg.text}</p>}
      <button className="button primary auth-submit" disabled={busy || !target}>
        {busy ? t('Envoi…', lang) : price == null ? t('Être contacté par l’équipe', lang) : t('Demander l’abonnement', lang)}
      </button>
    </form>
  )
}
