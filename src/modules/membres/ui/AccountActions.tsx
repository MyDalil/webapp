'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Déconnexion et suppression définitive du compte (droit à l’effacement). */
export function AccountActions() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const logout = async () => {
    await fetch('/api/members/logout', { method: 'POST', credentials: 'include' })
    router.push('/')
    router.refresh()
  }
  const remove = async () => {
    if (!window.confirm('Supprimer définitivement votre compte ? Vos rendez-vous à venir seront annulés et vos données effacées.')) return
    setBusy(true)
    await fetch('/api/compte', { method: 'DELETE' })
    router.push('/')
    router.refresh()
  }
  return (
    <div className="account-actions">
      <button className="button outline" onClick={logout}>
        Se déconnecter
      </button>
      <button className="auth-link danger" disabled={busy} onClick={remove}>
        Supprimer mon compte
      </button>
    </div>
  )
}
