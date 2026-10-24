'use client'

import { useEffect, useState } from 'react'
import { WILAYAS } from '@/platform/referentiel/catalog'

/**
 * Wilaya choisie par le visiteur (facultative) : gardée sur l’appareil, et dans le compte si connecté.
 * Elle pré-remplit les filtres, le week-end et l’assistant. Jamais de géolocalisation.
 */
const KEY = 'dalil-wilaya'
const EVENT = 'dalil:wilaya'

export type WilayaChoice = { code: number; name: string } | null

export const wilayaByCode = (code: unknown): WilayaChoice => {
  const w = WILAYAS.find((x) => x.code === Number(code))
  return w ? { code: w.code, name: w.name } : null
}

export function readWilaya(): WilayaChoice {
  try {
    return wilayaByCode(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function setWilaya(w: WilayaChoice, opts: { sync?: boolean } = { sync: true }) {
  try {
    if (w) localStorage.setItem(KEY, String(w.code))
    else localStorage.removeItem(KEY)
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: w }))
  // Compte connecté : même choix sur tous ses appareils (sans effet pour un visiteur).
  if (opts.sync !== false)
    fetch('/api/test-session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'wilaya', code: w?.code ?? null }) }).catch(() => {})
}

/** Wilaya courante, mise à jour en direct quand le visiteur la change ailleurs sur la page. */
export function useWilaya(): WilayaChoice {
  const [w, setW] = useState<WilayaChoice>(null)
  useEffect(() => {
    setW(readWilaya())
    const on = (e: Event) => setW((e as CustomEvent<WilayaChoice>).detail)
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  return w
}
