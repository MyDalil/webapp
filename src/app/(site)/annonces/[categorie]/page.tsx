import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { category, type SearchQuery } from '@/modules/annonces'
import { Browse } from '../Browse'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ categorie: string }>; searchParams: Promise<SearchQuery> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = category((await params).categorie)
  return c ? { title: `Annonces ${c.label.toLowerCase()} en Algérie · DALIL`, description: c.lead } : {}
}

export default async function AnnoncesCategorie({ params, searchParams }: Props) {
  const c = category((await params).categorie)
  if (!c) notFound()
  return <Browse q={await searchParams} fixedCategory={c.value} />
}
