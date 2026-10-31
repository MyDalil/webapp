import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { category } from '@/modules/services'
import { Browse, type BrowseQuery } from '../Browse'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ categorie: string }>; searchParams: Promise<BrowseQuery> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = category((await params).categorie)
  return c ? { title: `${c.label} · Services à domicile · DALIL`, description: `${c.activities.map(([, l]) => l).join(', ')}. Prestataires vérifiés par DALIL.` } : {}
}

export default async function ServiceCategory({ params, searchParams }: Props) {
  const c = category((await params).categorie)
  if (!c) notFound()
  return <Browse q={await searchParams} fixedCategory={c.value} />
}
