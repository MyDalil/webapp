'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'

type Kind = 'particulier' | 'pro'
type Tab = 'login' | 'signup' | 'forgot'

async function api(url: string, body: unknown, method = 'POST') {
  const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) })
  const data = await r.json().catch(() => ({}))
  return { ok: r.ok, data }
}
const errorOf = (d: { error?: string; errors?: { message?: string }[]; message?: string }) => d.error ?? d.errors?.[0]?.message ?? d.message ?? 'Une erreur est survenue.'

/** Connexion, création de compte et mot de passe oublié, pour un particulier ou un professionnel. */
export function AuthPanel({ kind }: { kind: Kind }) {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || (kind === 'pro' ? '/espace-pro' : '/mon-compte')
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'signup' ? 'signup' : 'login')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'error' | 'ok'; text: string } | null>(null)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    setBusy(true)
    setMsg(null)
    try {
      if (tab === 'login') {
        const r = await api('/api/members/login', { email: f.email, password: f.password })
        const why = errorOf(r.data)
        if (!r.ok) return setMsg({ type: 'error', text: /v[ée]rifi/i.test(why) ? 'Confirmez d’abord votre adresse email : un lien vous a été envoyé à l’inscription.' : /trop de tentatives|verrouill/i.test(why) ? why : 'Email ou mot de passe incorrect.' })
        router.push(next)
        router.refresh()
      } else if (tab === 'signup') {
        const r = await api('/api/compte', { ...f, kind, terms: f.terms === 'on' })
        if (!r.ok) return setMsg({ type: 'error', text: errorOf(r.data) })
        setMsg({ type: 'ok', text: `Compte créé. Ouvrez l’email envoyé à ${f.email} et confirmez votre adresse pour vous connecter.` })
        setTab('login')
      } else {
        const r = await api('/api/members/forgot-password', { email: f.email })
        if (!r.ok) return setMsg({ type: 'error', text: errorOf(r.data) })
        setMsg({ type: 'ok', text: 'Si un compte existe avec cet email, vous allez recevoir un lien pour choisir un nouveau mot de passe.' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-panel">
      <div className="auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'login'} onClick={() => setTab('login')}>
          Se connecter
        </button>
        <button type="button" role="tab" aria-selected={tab === 'signup'} onClick={() => setTab('signup')}>
          Créer un compte
        </button>
      </div>
      {msg && <p className={`auth-msg ${msg.type}`} role={msg.type === 'error' ? 'alert' : 'status'}>{msg.text}</p>}
      <form onSubmit={submit} className="auth-form" key={tab}>
        {tab === 'signup' && (
          <div className="auth-row">
            <label>
              Prénom
              <input name="firstName" required autoComplete="given-name" maxLength={80} />
            </label>
            <label>
              Nom
              <input name="lastName" required autoComplete="family-name" maxLength={80} />
            </label>
          </div>
        )}
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        {tab === 'signup' && (
          <label>
            Téléphone
            <input name="phone" type="tel" required autoComplete="tel" placeholder="+213 …" maxLength={30} />
          </label>
        )}
        {tab !== 'forgot' && (
          <label>
            Mot de passe
            <input name="password" type="password" required minLength={tab === 'signup' ? 10 : 1} autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} />
            {tab === 'signup' && <small>10 caractères minimum.</small>}
          </label>
        )}
        {tab === 'signup' && (
          <label className="auth-check">
            <input type="checkbox" name="terms" required />
            <span>
              J’accepte les <Link href="/conditions-utilisation">conditions d’utilisation</Link> et la <Link href="/confidentialite">politique de confidentialité</Link>.
            </span>
          </label>
        )}
        <button className="button primary auth-submit" disabled={busy}>
          {busy ? 'Un instant…' : tab === 'login' ? 'Se connecter' : tab === 'signup' ? 'Créer mon compte gratuitement' : 'Recevoir le lien'}
        </button>
        {tab === 'login' && (
          <button type="button" className="auth-link" onClick={() => setTab('forgot')}>
            Mot de passe oublié ?
          </button>
        )}
        {tab === 'forgot' && (
          <button type="button" className="auth-link" onClick={() => setTab('login')}>
            ← Retour à la connexion
          </button>
        )}
      </form>
    </div>
  )
}

/** Nouveau mot de passe depuis le lien reçu par email. */
export function ResetPassword({ token }: { token: string }) {
  const router = useRouter()
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
