import type { MetadataRoute } from 'next'

/**
 * Application installable (PWA). Couleurs : --bg et --green de src/styles/mockup.css (thème clair, le même que themeColor du site).
 * Icônes : générées depuis public/favicon.svg par scripts/icons.mjs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'DALIL — Guide de l’Algérie',
    short_name: 'DALIL',
    description: 'DALIL, le guide de confiance pour explorer, vivre et avancer en Algérie.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fbfaf7',
    theme_color: '#fbfaf7',
    lang: 'fr',
    dir: 'auto',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Recherche', url: '/recherche', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'Santé', url: '/praticiens', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'Annonces', url: '/annonces', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
    ],
  }
}
