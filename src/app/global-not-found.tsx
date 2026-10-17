import type { Metadata } from 'next'
import SiteLayout from './(site)/layout'
import NotFound from './(site)/not-found'

/** 404 de tout le site (adresse inconnue, fiche absente) : même en-tête, même pied de page que le site. */
export const metadata: Metadata = { title: 'Page introuvable · DALIL', robots: { index: false } }

export default function GlobalNotFound() {
  return (
    <SiteLayout>
      <NotFound />
    </SiteLayout>
  )
}
