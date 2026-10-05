'use client'

import { useState, type FormEvent } from 'react'
import { WILAYAS } from '@/content/catalog'

export function ApplicationForm() {
  const [msg, setMsg] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg('Envoi…')
    const form = e.currentTarget
    const r = await fetch('/api/applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) })
    const j = await r.json()
    if (!r.ok) return setMsg(j.error ?? 'Impossible d’envoyer la candidature.')
    form.reset()
    setMsg('Candidature enregistrée. Vous pouvez suivre son statut dans votre espace.')
  }
  return (
    <form className="product-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          <span>Nom de l’activité *</span>
          <input name="businessName" required maxLength={120} />
        </label>
        <label>
          <span>Catégorie *</span>
          <input name="category" required maxLength={80} />
        </label>
        <label>
          <span>Wilaya *</span>
          <select name="wilaya" required defaultValue="">
            <option value="" disabled>
              Choisir
            </option>
            {WILAYAS.map((w) => (
              <option key={w.code}>{w.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Téléphone *</span>
          <input name="phone" required maxLength={30} />
        </label>
      </div>
      <label>
        <span>Activité et services *</span>
        <textarea name="description" required minLength={30} maxLength={1200} />
      </label>
      <button className="green-button" type="submit">
        Déposer ma candidature
      </button>
      <p className="form-status" aria-live="polite">
        {msg}
      </p>
    </form>
  )
}
