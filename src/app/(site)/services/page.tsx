import type { Metadata } from 'next'
import { Browse, type BrowseQuery } from './Browse'

export const metadata: Metadata = { title: 'Services à domicile · DALIL', description: 'Ménage, bricolage, garde d’enfants, cours coraniques, coach sportif… Prestataires vérifiés par DALIL, réponse sous 24 h.' }
export const dynamic = 'force-dynamic'

export default async function Services({ searchParams }: { searchParams: Promise<BrowseQuery> }) {
  return <Browse q={await searchParams} />
}
