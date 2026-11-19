'use client'

import type { MetricKind } from './core'

/**
 * Côté navigateur : envoie un évènement de mesure par `navigator.sendBeacon` (sans cookie, sans donnée personnelle).
 * Ne lève jamais d’erreur : la mesure ne gêne pas la page.
 */
export type BeaconTarget = { collection: string; id: string | number }

export function sendMetric(target: BeaconTarget | null | undefined, kind: MetricKind) {
  if (!target) return
  try {
    const body = JSON.stringify({ c: target.collection, i: String(target.id), k: kind })
    if (navigator.sendBeacon?.('/api/m', new Blob([body], { type: 'application/json' }))) return
    void fetch('/api/m', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {})
  } catch {
    /* navigateur sans beacon : ignoré */
  }
}

/** Une vue par fiche et par session du navigateur (sessionStorage) ; navigation privée stricte : une vue par chargement. */
export function sendViewOnce(target: BeaconTarget | null | undefined) {
  if (!target) return
  const key = `dalil:vu:${target.collection}:${target.id}`
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    /* stockage indisponible : on compte quand même cette vue */
  }
  sendMetric(target, 'view')
}
