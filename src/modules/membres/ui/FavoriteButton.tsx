'use client'

import { favKey, markFavorite, savedFavorites } from './favoritesStore'
import { useEffect, useState } from 'react'
import { openLogin } from '@/platform/shell/LoginDialog'
import { toast } from '@/platform/shell/toast'

export function FavoriteButton({ itemType, itemKey, label }: { itemType: string; itemKey: string; label: string }) {
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const path = itemType === 'guide' ? `/guides/${encodeURIComponent(itemKey)}` : itemType === 'listing' ? `/adresses/${encodeURIComponent(itemKey)}` : '/annuaire'

  useEffect(() => {
    let alive = true
    savedFavorites()
      .then((set) => alive && setSaved(set.has(favKey(itemType, itemKey))))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [itemType, itemKey, path])

  async function onClick() {
    setBusy(true)
    try {
      const r = await fetch('/api/favorites', {
        method: saved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType, itemKey, label }),
      })
      if (r.status === 401) {
        openLogin()
        return
      }
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Enregistrement impossible.')
      const msg = saved ? 'Favori retiré.' : 'Ajouté à vos favoris.'
      setSaved(!saved)
      markFavorite(itemType, itemKey, !saved)
      setStatus(msg)
      toast(msg)
    } catch (e) {
      setStatus((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <span>
      <button className="outline-button" onClick={onClick} disabled={busy} aria-pressed={saved}>
        {saved ? '♥ Enregistré' : '♡ Enregistrer'}
      </button>
      <small className="form-status" aria-live="polite">
        {status}
      </small>
    </span>
  )
}
