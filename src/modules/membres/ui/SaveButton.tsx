'use client'

import { favKey, markFavorite, savedFavorites } from './favoritesStore'
import { useEffect, useState } from 'react'
import { Icon } from '@/platform/ui/Icon'
import { toast } from '@/platform/shell/toast'
import { openLogin } from '@/platform/shell/LoginDialog'

/** Bouton « Enregistrer » de la maquette, branché sur les favoris (session visiteur). */
export function SaveButton({ itemType, itemKey, label, variant = 'icon' }: { itemType: string; itemKey: string; label: string; variant?: 'icon' | 'button' }) {
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    savedFavorites()
      .then((set) => alive && setSaved(set.has(favKey(itemType, itemKey))))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [itemType, itemKey])

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await fetch('/api/favorites', {
        method: saved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType, itemKey, label }),
      })
      if (r.status === 401) {
        toast('Créez votre accès gratuit pour enregistrer')
        openLogin()
        return
      }
      if (!r.ok) throw new Error()
      setSaved(!saved)
      markFavorite(itemType, itemKey, !saved)
      toast(saved ? 'Retiré de vos favoris' : 'Ajouté à vos favoris')
    } catch {
      toast('Enregistrement impossible, réessayez')
    } finally {
      setBusy(false)
    }
  }

  if (variant === 'button')
    return (
      <button className={`button outline ${saved ? 'saved' : ''}`} onClick={toggle} disabled={busy} aria-pressed={saved}>
        <Icon name="bookmark" /> {saved ? 'Enregistré' : 'Enregistrer'}
      </button>
    )
  return (
    <button className={`save-button ${saved ? 'saved' : ''}`} type="button" aria-label={`${saved ? 'Retirer' : 'Enregistrer'} ${label}`} aria-pressed={saved} onClick={toggle} disabled={busy}>
      <Icon name="bookmark" />
    </button>
  )
}
