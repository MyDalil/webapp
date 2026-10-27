'use client'

import { useState, type FormEvent } from 'react'
import { proofHeaders } from '@/platform/security/proofClient'

/** Demande d’accompagnement (liste d’attente tant que l’offre n’est pas ouverte). Aucun paiement ici. */
export function RequestForm({ pack, waitlist, persons = 1 }: { pack: string; waitlist: boolean; persons?: number }) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = Object.fromEntries(new FormData(form))
    setState('loading')
    setMsg('Envoi en cours…')
    try {
      const r = await fetch('/api/accompagnement', { method: 'POST', headers: await proofHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ ...fd, pack, persons }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Envoi impossible.')
      setState('success')
      setMsg(j.waitlist ? 'C’est noté : nous vous écrivons dès l’ouverture. Rien à payer aujourd’hui.' : 'Demande reçue : un conseiller vous contacte pour fixer votre appel.')
      form.reset()
    } catch (err) {
      setState('error')
      setMsg(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  return (
    <form className="ac-form" onSubmit={onSubmit} aria-busy={state === 'loading'}>
      <label>
        Nom
        <input name="name" required maxLength={120} autoComplete="name" />
      </label>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Téléphone ou WhatsApp <small>(facultatif)</small>
        <input name="phone" type="tel" maxLength={30} autoComplete="tel" />
      </label>
      <label>
        Pays de résidence <small>(facultatif)</small>
        <input name="country" maxLength={80} autoComplete="country-name" />
      </label>
      <label className="is-wide">
        Votre situation <small>(facultatif)</small>
        <textarea name="message" rows={4} maxLength={3000} />
      </label>
      <input className="honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button type="submit" className="sr-pill is-primary" disabled={state === 'loading' || state === 'success'}>
        {waitlist ? 'M’inscrire sur la liste d’attente' : 'Envoyer ma demande'}
      </button>
      <small role="status" className={state === 'error' ? 'form-error' : state === 'success' ? 'form-success' : ''}>
        {msg || 'Vos coordonnées servent seulement à vous recontacter pour cet accompagnement.'}
      </small>
    </form>
  )
}
