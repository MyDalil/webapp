'use client'

import { useState, type FormEvent } from 'react'
import { proofHeaders } from '@/platform/security/proofClient'
import type { Lang } from '@/platform/i18n'

const UI = {
  fr: { loading: 'Inscription en cours…', error: 'Une erreur est survenue.', email: 'Votre adresse email', placeholder: 'votre@email.com', submit: 'S’inscrire' },
  en: { loading: 'Subscribing…', error: 'Subscription failed. Please try again.', email: 'Your email address', placeholder: 'you@email.com', submit: 'Subscribe' },
  ar: { loading: 'جارٍ التسجيل…', error: 'تعذّر التسجيل. حاول مرة أخرى.', email: 'بريدك الإلكتروني', placeholder: 'you@email.com', submit: 'اشترك' },
}
const SUCCESS = { en: 'You’re subscribed. Welcome!', ar: 'تم تسجيلك. مرحبًا بك!' }

export function NewsletterForm({
  source = 'website',
  title = 'Recevoir les prochaines ouvertures',
  note = '',
  successMessage = 'Inscription enregistrée. Bienvenue dans l’accès prioritaire.',
  lang = 'fr',
}: {
  lang?: Lang
  source?: string
  title?: string | null
  note?: string
  successMessage?: string
}) {
  const u = UI[lang]
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState(note || 'Aucun spam. Désinscription immédiate.')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setState('loading')
    setMsg(u.loading)
    try {
      const r = await fetch('/api/subscribers', {
        method: 'POST',
        headers: await proofHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ email: fd.get('email'), website: fd.get('website'), source }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Inscription impossible.')
      setState('success')
      setMsg(lang === 'fr' ? successMessage : SUCCESS[lang])
      form.reset()
    } catch (err) {
      setState('error')
      setMsg(lang === 'fr' && err instanceof Error ? err.message : u.error)
    }
  }

  return (
    <form className="newsletter" onSubmit={onSubmit} aria-busy={state === 'loading'}>
      {title && <strong>{title}</strong>}
      <label>
        <span className="sr-only">{u.email}</span>
        <input type="email" name="email" required placeholder={u.placeholder} dir="ltr" />
        <input className="honeypot" name="website" tabIndex={-1} autoComplete="off" />
        <button type="submit" aria-label={u.submit} disabled={state === 'loading'}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </label>
      <small className={state === 'error' ? 'form-error' : state === 'success' ? 'form-success' : ''}>{msg}</small>
    </form>
  )
}
