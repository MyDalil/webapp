'use client'

import Link from '@/platform/ui/Link'
import { useSearchParams } from 'next/navigation'
import { useLangRouter } from '@/platform/ui/lang'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { COMMON_BOXES, mailboxOf } from './mailbox'
import { proofHeaders } from '@/platform/security/proofClient'

type Kind = 'particulier' | 'pro'
type Step = 'email' | 'code' | 'profile'

async function api(url: string, body: unknown, method = 'POST', headers: Record<string, string> = { 'content-type': 'application/json' }) {
  const r = await fetch(url, { method, headers, credentials: 'include', body: JSON.stringify(body) })
  const data = await r.json().catch(() => ({}))
  return { ok: r.ok, data }
}
const errorOf = (d: { error?: string; errors?: { message?: string }[]; message?: string }) => d.error ?? d.errors?.[0]?.message ?? d.message ?? 'Une erreur est survenue.'
const otp = async (body: Record<string, unknown>) =>
  api('/api/members/otp', body, 'POST', body.action === 'send' ? await proofHeaders({ 'content-type': 'application/json' }) : undefined)

/** Brouillon de connexion gardé dans l’onglet : un retour arrière ne fait rien retaper (jamais le code lui-même). */
const DRAFT = 'dalil-auth-brouillon'
type Draft = { step: Step; kind: Kind; email: string; challenge: string; ticket: string; firstName: string; lastName: string; phone: string; terms: boolean }
const readDraft = (): Partial<Draft> => {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT) ?? '{}') as Partial<Draft>
  } catch {
    return {}
  }
}
const writeDraft = (d: Draft) => {
  try {
    sessionStorage.setItem(DRAFT, JSON.stringify(d))
  } catch {}
}
const clearDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT)
  } catch {}
}

/**
 * Connexion et inscription en une seule entrée, comme les applications actuelles :
 * email → code à 6 chiffres reçu par email → (nouveau compte) prénom, nom, téléphone. Aucun mot de passe.
 */
export function AuthPanel({ kind: initialKind = 'particulier' }: { kind?: Kind }) {
  const router = useLangRouter()
  const params = useSearchParams()
  // Retour après connexion : uniquement une page de DALIL (jamais un autre site).
  const asked = params.get('next') ?? ''
  const [step, setStep] = useState<Step>('email')
  const [kind, setKind] = useState<Kind>(initialKind)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState('')
  const [ticket, setTicket] = useState('')
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(0)
  const [msg, setMsg] = useState<{ type: 'error' | 'ok'; text: string } | null>(null)
  const [who, setWho] = useState({ firstName: '', lastName: '', phone: '', terms: false })
  const codeRef = useRef<HTMLInputElement>(null)
  const restored = useRef(false)

  // Retour sur la page : on reprend là où la personne s’était arrêtée.
  useEffect(() => {
    const d = readDraft()
    if (d.email) setEmail(d.email)
    if (d.kind) setKind(d.kind)
    if (d.challenge) setChallenge(d.challenge)
    if (d.ticket) setTicket(d.ticket)
    setWho({ firstName: d.firstName ?? '', lastName: d.lastName ?? '', phone: d.phone ?? '', terms: Boolean(d.terms) })
    if (d.step === 'profile' && d.ticket) setStep('profile')
    else if (d.step === 'code' && d.challenge) setStep('code')
    restored.current = true
  }, [])
  useEffect(() => {
    if (restored.current) writeDraft({ step, kind, email, challenge, ticket, ...who })
  }, [step, kind, email, challenge, ticket, who])

  useEffect(() => {
    if (!wait) return
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(t)
  }, [wait])
  useEffect(() => {
    if (step === 'code') codeRef.current?.focus()
  }, [step])

  const done = (k: Kind) => {
    clearDraft()
    const next = /^\/(?![\/\\])/.test(asked) ? asked : k === 'pro' ? '/espace-pro' : '/mon-compte'
    router.push(next)
    router.refresh()
  }

  async function sendCode(e?: FormEvent) {
    e?.preventDefault()
    setBusy(true)
    setMsg(null)
    const r = await otp({ action: 'send', email })
    setBusy(false)
    if (!r.ok) return setMsg({ type: 'error', text: errorOf(r.data) })
    setChallenge(String(r.data.challenge))
    setCode('')
    setStep('code')
    setWait(30)
  }

  async function verify(value = code) {
    if (value.length !== 6 || busy) return
    setBusy(true)
    setMsg(null)
    const r = await otp({ action: 'verify', challenge, code: value })
    setBusy(false)
    if (!r.ok) {
      setCode('')
      codeRef.current?.focus()
      return setMsg({ type: 'error', text: errorOf(r.data) })
    }
    if (r.data.status === 'new') {
      setTicket(String(r.data.ticket))
      return setStep('profile')
    }
    done(r.data.kind === 'pro' ? 'pro' : 'particulier')
  }

  async function complete(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const r = await otp({ action: 'complete', ticket, kind, ...who })
    setBusy(false)
    if (!r.ok) return setMsg({ type: 'error', text: errorOf(r.data) })
    done(kind)
  }

  return (
    <div className="auth-panel otp-panel">
      <ol className="otp-steps" aria-label="Étapes">
        {(['email', 'code', 'profile'] as Step[]).map((s, i) => (
          <li key={s} className={s === step ? 'is-on' : (['email', 'code', 'profile'].indexOf(step) > i ? 'is-done' : '')} aria-current={s === step ? 'step' : undefined} />
        ))}
      </ol>
      {msg && (
        <p className={`auth-msg ${msg.type}`} role={msg.type === 'error' ? 'alert' : 'status'}>
          {msg.text}
        </p>
      )}

      {step === 'email' && (
        <form onSubmit={sendCode} className="auth-form">
          <label>
            Votre email
            <input name="email" type="email" required autoComplete="email" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value.trim())} placeholder="nom@exemple.com" />
            <small>Nous vous envoyons un code. Pas de mot de passe à retenir.</small>
          </label>
          <button className="button primary auth-submit" disabled={busy || !email}>
            {busy ? 'Envoi du code…' : 'Continuer'}
          </button>
          <p className="otp-legal">
            En continuant, vous acceptez les <Link href="/conditions-utilisation">conditions d’utilisation</Link> et la <Link href="/confidentialite">politique de confidentialité</Link>.
          </p>
        </form>
      )}

      {step === 'code' && (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault()
            verify()
          }}
        >
          <p className="otp-sent">
            Code envoyé à <b>{email}</b>.{' '}
            <button type="button" className="auth-link" onClick={() => (setStep('email'), setMsg(null))}>
              Modifier
            </button>
          </p>
          <label className="otp-field">
            <span>Code à 6 chiffres</span>
            <input
              ref={codeRef}
              name="code"
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                setCode(v)
                if (v.length === 6) verify(v)
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              aria-describedby="otp-help"
            />
            <span className="otp-boxes" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <i key={i} className={i === code.length ? 'is-next' : ''}>
                  {code[i] ?? ''}
                </i>
              ))}
            </span>
          </label>
          <MailboxLinks email={email} />
          <small id="otp-help">Vérifiez aussi le dossier « Indésirables ». Le code est valable 10 minutes.</small>
          <button className="button primary auth-submit" disabled={busy || code.length !== 6}>
            {busy ? 'Vérification…' : 'Valider'}
          </button>
          <button type="button" className="auth-link" disabled={wait > 0 || busy} onClick={() => sendCode()}>
            {wait > 0 ? `Renvoyer le code dans ${wait} s` : 'Renvoyer le code'}
          </button>
        </form>
      )}

      {step === 'profile' && (
        <form onSubmit={complete} className="auth-form">
          <p className="otp-sent">Email vérifié. Encore une étape pour créer votre compte.</p>
          <div className="otp-kind" role="radiogroup" aria-label="Type de compte">
            <button type="button" role="radio" aria-checked={kind === 'particulier'} onClick={() => setKind('particulier')}>
              <b>Particulier</b>
              <small>Rendez-vous, favoris, démarches</small>
            </button>
            <button type="button" role="radio" aria-checked={kind === 'pro'} onClick={() => setKind('pro')}>
              <b>Professionnel</b>
              <small>Fiche, agenda, demandes, avis</small>
            </button>
          </div>
          <div className="auth-row">
            <label>
              Prénom
              <input name="firstName" required autoComplete="given-name" maxLength={80} autoFocus value={who.firstName} onChange={(e) => setWho({ ...who, firstName: e.target.value })} />
            </label>
            <label>
              Nom
              <input name="lastName" required autoComplete="family-name" maxLength={80} value={who.lastName} onChange={(e) => setWho({ ...who, lastName: e.target.value })} />
            </label>
          </div>
          <label>
            Téléphone
            <input name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="+213 5 55 00 00 00" maxLength={30} value={who.phone} onChange={(e) => setWho({ ...who, phone: e.target.value })} />
            <small>Utilisé seulement pour vos rendez-vous et demandes.</small>
          </label>
          <label className="auth-check">
            <input type="checkbox" name="terms" required checked={who.terms} onChange={(e) => setWho({ ...who, terms: e.target.checked })} />
            <span>
              J’accepte les <Link href="/conditions-utilisation">conditions d’utilisation</Link> et la <Link href="/confidentialite">politique de confidentialité</Link>.
            </span>
          </label>
          <button className="button primary auth-submit" disabled={busy}>
            {busy ? 'Création…' : 'Créer mon compte gratuitement'}
          </button>
        </form>
      )}
    </div>
  )
}

/** Bouton vers la boîte de réception de la personne ; fournisseur inconnu : les messageries courantes. */
function MailboxLinks({ email }: { email: string }) {
  const box = mailboxOf(email)
  const boxes = box ? [box] : COMMON_BOXES
  return (
    <div className={`otp-mailbox${box ? '' : ' is-many'}`}>
      {boxes.map((b) => (
        <a key={b.url} className={box ? 'button outline auth-submit' : 'otp-mailbox-link'} href={b.url} target="_blank" rel="noreferrer">
          {box ? `Ouvrir ${b.label}` : b.label}
        </a>
      ))}
      {!box && <small>Ouvrez votre messagerie pour lire le code.</small>}
    </div>
  )
}

/** Nouveau mot de passe depuis le lien reçu par email. */
export function ResetPassword({ token }: { token: string }) {
  const router = useLangRouter()
  const [msg, setMsg] = useState<string | null>(null)
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const password = String(new FormData(e.currentTarget).get('password'))
    const r = await api('/api/members/reset-password', { token, password })
    if (!r.ok) return setMsg('Lien expiré ou invalide. Recommencez depuis « Mot de passe oublié ».')
    router.push('/mon-compte')
    router.refresh()
  }
  return (
    <form onSubmit={submit} className="auth-form">
      {msg && <p className="auth-msg error">{msg}</p>}
      <label>
        Nouveau mot de passe
        <input name="password" type="password" required minLength={10} autoComplete="new-password" />
        <small>10 caractères minimum.</small>
      </label>
      <button className="button primary auth-submit">Enregistrer</button>
    </form>
  )
}
