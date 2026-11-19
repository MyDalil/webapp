'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLang, useLangRouter } from '@/platform/ui/lang'
import { CATEGORY_T, SECTOR_T, tr } from '@/platform/i18n'
import { EXISTING_FLOW, PLACE_SECTORS, type ActivityKind } from './parcours'
import { t } from './t'

type Fields = { wilaya: string; sector: string; category: string; name: string; city: string; address: string; phone: string; intro: string }
const KEY = 'dalil-inscrire'
const EMPTY: Fields = { wilaya: '', sector: '', category: '', name: '', city: '', address: '', phone: '', intro: '' }

const KINDS: { k: ActivityKind; label: string; lead: string }[] = [
  { k: 'sante', label: 'Praticien de santé', lead: 'Médecin, dentiste, kiné… agenda de rendez-vous en ligne.' },
  { k: 'services', label: 'Services à domicile', lead: 'Ménage, bricolage, garde d’enfants, cours, coaching…' },
  { k: 'etablissement', label: 'Autre établissement', lead: 'Restaurant, commerce, école, hôtel, agence…' },
]

/**
 * « Inscrire mon activité » : un seul formulaire. Santé et services → parcours existants de l’espace pro ;
 * autre établissement → wilaya, secteur, catégorie, puis seulement les champs utiles → brouillon (jamais publié).
 * Sans compte : la saisie est gardée dans l’onglet le temps de la connexion par code email (parcours existant).
 */
export function ActivityForm({ wilayas, loggedIn, prefill }: { wilayas: { code: number; name: string }[]; loggedIn: boolean; prefill?: { phone?: string } }) {
  const lang = useLang()
  const router = useLangRouter()
  const [kind, setKind] = useState<ActivityKind | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const [f, setF] = useState<Fields>({ ...EMPTY, phone: prefill?.phone ?? '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const sector = useMemo(() => PLACE_SECTORS.find((s) => s.slug === f.sector), [f.sector])

  // Retour de connexion : reprise de la saisie gardée dans l’onglet.
  useEffect(() => {
    const saved = sessionStorage.getItem(KEY)
    if (!saved || !loggedIn) return
    try {
      setF({ ...EMPTY, ...(JSON.parse(saved) as Partial<Fields>) })
      setKind('etablissement')
      setStep(2)
    } catch {}
    sessionStorage.removeItem(KEY)
  }, [loggedIn])

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value, ...(k === 'sector' ? { category: '' } : {}) }))
  const login = (next: string) => router.push(`/connexion/professionnel?next=${encodeURIComponent(next)}`)

  function choose(k: ActivityKind) {
    setMsg(null)
    if (k === 'etablissement') return setKind(k)
    if (!loggedIn) return login(EXISTING_FLOW[k])
    router.push(EXISTING_FLOW[k])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) return setStep(2)
    if (!loggedIn) {
      sessionStorage.setItem(KEY, JSON.stringify(f))
      return login('/inscrire')
    }
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/pro/inscription', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) })
      const d = (await r.json().catch(() => ({}))) as { message?: string; error?: string }
      setMsg(r.ok ? { type: 'ok', text: d.message ?? '' } : { type: 'error', text: d.error ?? t('Erreur réseau. Réessayez.', lang) })
      if (r.ok) setF(EMPTY)
    } catch {
      setMsg({ type: 'error', text: t('Erreur réseau. Réessayez.', lang) })
    } finally {
      setBusy(false)
    }
  }

  if (kind !== 'etablissement')
    return (
      <div className="auth-choice">
        {KINDS.map(({ k, label, lead }) => (
          <button key={k} type="button" className="auth-card" onClick={() => choose(k)}>
            <span className="auth-card-kicker">{t('Je suis', lang)}</span>
            <b>{t(label, lang)}</b>
            <span>{t(lead, lang)}</span>
          </button>
        ))}
      </div>
    )

  if (msg?.type === 'ok')
    return (
      <section className="account-block">
        <p className="auth-msg ok">{msg.text}</p>
        <div className="button-row">
          <button type="button" className="button primary" onClick={() => router.push('/espace-pro')}>
            {t('Mon espace pro', lang)}
          </button>
        </div>
      </section>
    )

  return (
    <form className="auth-form pro-form" onSubmit={submit}>
      <div className="auth-row">
        <label>
          {t('Wilaya', lang)}
          <select name="wilaya" required value={f.wilaya} onChange={set('wilaya')}>
            <option value="" disabled>
              {t('Choisir…', lang)}
            </option>
            {wilayas.map((w) => (
              <option key={w.code} value={String(w.code)}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Secteur', lang)}
          <select name="sector" required value={f.sector} onChange={set('sector')}>
            <option value="" disabled>
              {t('Choisir…', lang)}
            </option>
            {PLACE_SECTORS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {tr(s.title, SECTOR_T, lang)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Catégorie', lang)}
          <select name="category" required value={f.category} onChange={set('category')} disabled={!sector}>
            <option value="" disabled>
              {t('Choisir…', lang)}
            </option>
            {sector?.categories.map((c) => (
              <option key={c} value={c}>
                {tr(c, CATEGORY_T, lang)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {step === 2 && (
        <>
          <div className="auth-row">
            <label>
              {t('Nom de l’établissement', lang)}
              <input name="name" required minLength={2} maxLength={120} value={f.name} onChange={set('name')} autoComplete="organization" />
            </label>
            <label>
              {t('Ville', lang)}
              <input name="city" required minLength={2} maxLength={80} value={f.city} onChange={set('city')} autoComplete="address-level2" />
            </label>
          </div>
          <div className="auth-row">
            <label>
              {t('Adresse complète', lang)}
              <input name="address" maxLength={200} value={f.address} onChange={set('address')} autoComplete="street-address" />
            </label>
            <label>
              {t('Téléphone professionnel', lang)}
              <input name="phone" type="tel" inputMode="tel" maxLength={20} value={f.phone} onChange={set('phone')} autoComplete="tel" dir="ltr" />
            </label>
          </div>
          <label>
            {t('Présentation', lang)}
            <textarea name="intro" rows={3} maxLength={600} value={f.intro} onChange={set('intro')} />
            <small>{t('Deux ou trois phrases factuelles.', lang)}</small>
          </label>
          <p className="muted-line">{t('Votre fiche reste en brouillon : l’équipe DALIL la relit avant toute publication.', lang)}</p>
        </>
      )}
      {msg && <p className={`auth-msg ${msg.type}`}>{msg.text}</p>}
      <div className="button-row">
        <button type="button" className="button outline" onClick={() => (step === 2 ? setStep(1) : setKind(null))}>
          {t('Retour', lang)}
        </button>
        <button className="button primary auth-submit" disabled={busy}>
          {busy ? t('Envoi…', lang) : step === 1 ? t('Continuer', lang) : loggedIn ? t('Enregistrer en brouillon', lang) : t('Se connecter pour enregistrer', lang)}
        </button>
      </div>
    </form>
  )
}
