import type { Metadata } from 'next'
import SiteLayout from './(site)/[lang]/layout'
import NotFound from './(site)/[lang]/not-found'

/** 404 de tout le site (adresse inconnue, fiche absente) : même en-tête, même pied de page que le site (en français). */
export const metadata: Metadata = { title: 'Page introuvable · DALIL', robots: { index: false } }

export default function GlobalNotFound() {
  return (
    <SiteLayout params={Promise.resolve({ lang: 'fr' })}>
      <NotFound />
    </SiteLayout>
  )
}
