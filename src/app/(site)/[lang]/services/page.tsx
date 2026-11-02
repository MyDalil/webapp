import type { Metadata } from 'next'
import { Browse, type BrowseQuery } from './Browse'

export const metadata: Metadata = { title: 'Services à domicile', description: 'Ménage, bricolage, garde d’enfants, cours coraniques, coach sportif… Décrivez votre besoin : DALIL vous indique les professionnels disponibles dans votre zone.' }
export const dynamic = 'force-dynamic'

export default async function Services({ searchParams }: { searchParams: Promise<BrowseQuery> }) {
  return <Browse q={await searchParams} />
}
