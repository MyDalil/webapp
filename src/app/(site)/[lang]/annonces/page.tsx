import { isLang } from '@/platform/i18n'
import type { Metadata } from 'next'
import type { SearchQuery } from '@/modules/annonces'
import { Browse } from './Browse'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Annonces — immobilier, emploi, véhicules, objets', description: 'Annonces contrôlées par DALIL dans toute l’Algérie : immobilier, emploi, véhicules et objets. Échanges dans la messagerie DALIL.' }

export default async function Annonces({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<SearchQuery> }) {
  const { lang } = await params
  return <Browse q={await searchParams} lang={isLang(lang) ? lang : 'fr'} />
}
