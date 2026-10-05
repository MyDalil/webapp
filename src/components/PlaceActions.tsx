'use client'

import { toast } from './shell/toast'

export function PlaceActions({ name }: { name: string }) {
  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: `${name} · DALIL`, url })
      else {
        await navigator.clipboard.writeText(url)
        toast('Lien copié')
      }
    } catch {
      /* partage annulé */
    }
  }
  return (
    <button className="button primary" type="button" onClick={share}>
      Partager
    </button>
  )
}
