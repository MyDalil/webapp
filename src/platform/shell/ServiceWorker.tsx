'use client'

import { useEffect } from 'react'

/** Installe le service worker (public/sw.js) : production et HTTPS seulement, après le chargement, sans bloquer l’affichage. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || location.protocol !== 'https:' || !('serviceWorker' in navigator)) return
    const register = () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])
  return null
}
