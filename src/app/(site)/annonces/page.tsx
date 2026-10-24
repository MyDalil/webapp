import type { Metadata } from 'next'
import type { SearchQuery } from '@/modules/annonces'
import { Browse } from './Browse'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Annonces — immobilier, emploi, véhicules, objets · DALIL', description: 'Annonces contrôlées par DALIL dans toute l’Algérie : immobilier, emploi, véhicules et objets. Échanges dans la messagerie DALIL.' }

export default async function Annonces({ searchParams }: { searchParams: Promise<SearchQuery> }) {
  return <Browse q={await searchParams} />
}
