'use client'

import { useState, type FormEvent } from 'react'

export function NewsletterForm({
  source = 'website',
  title = 'Recevoir les prochaines ouvertures',
  successMessage = 'Inscription enregistrée. Bienvenue dans l’accès prioritaire.',
}: {
  source?: string
  title?: string
  successMessage?: string
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('Aucun spam. Désinscription immédiate.')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setState('loading')
    setMsg('Inscription en cours…')
    try {
      const r = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: fd.get('email'), website: fd.get('website'), source }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Inscription impossible.')
      setState('success')
      setMsg(successMessage)
      form.reset()
    } catch (err) {
      setState('error')
      setMsg(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  return (
    <form className="newsletter" onSubmit={onSubmit} aria-busy={state === 'loading'}>
      <strong>{title}</strong>
      <label>
        <span className="sr-only">Votre adresse email</span>
        <input type="email" name="email" required placeholder="votre@email.com" />
        <input className="honeypot" name="website" tabIndex={-1} autoComplete="off" />
        <button type="submit" aria-label="S’inscrire" disabled={state === 'loading'}>
          →
        </button>
      </label>
      <small className={state === 'error' ? 'form-error' : state === 'success' ? 'form-success' : ''}>{msg}</small>
    </form>
  )
}
