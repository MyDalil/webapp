'use client'

import { useEffect, useState } from 'react'
import { testAction } from './TestExperience'
import { toast } from '../shell/toast'

export function FavoriteButton({ itemType, itemKey, label }: { itemType: string; itemKey: string; label: string }) {
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [testMode, setTestMode] = useState(false)
  const path = itemType === 'guide' ? `/guides/${encodeURIComponent(itemKey)}` : itemType === 'listing' ? `/adresses/${encodeURIComponent(itemKey)}` : '/annuaire'

  useEffect(() => {
    let alive = true
    fetch('/api/test-session')
      .then((r) => r.json())
      .then(async (s) => {
        if (!alive) return
        if (s.profile) {
          setTestMode(true)
          setSaved(s.favorites.some((f: { path: string }) => f.path === path))
        } else {
          const r = await (await fetch(`/api/favorites?type=${encodeURIComponent(itemType)}&key=${encodeURIComponent(itemKey)}`)).json()
          if (alive) setSaved(!!r.saved)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [itemType, itemKey, path])

  async function onClick() {
    setBusy(true)
    try {
      if (testMode) await testAction({ action: 'favorite', path, label, remove: saved })
      else {
        const r = await fetch('/api/favorites', {
          method: saved ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemType, itemKey, label }),
        })
        if (r.status === 401) {
          window.location.assign('/onboarding')
          return
        }
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Enregistrement impossible.')
      }
      const msg = saved ? 'Favori retiré.' : 'Ajouté à vos favoris.'
      setSaved(!saved)
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
