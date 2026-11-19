import { isLang } from '@/platform/i18n'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { category, type SearchQuery } from '@/modules/annonces'
import { Browse } from '../Browse'
import { withSectionGate } from '@/platform/ui/SectionGate'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ categorie: string; lang: string }>; searchParams: Promise<SearchQuery> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = category((await params).categorie)
  return c ? { title: `Annonces ${c.label.toLowerCase()} en Algérie`, description: c.lead } : {}
}

async function AnnoncesCategorie({ params, searchParams }: Props) {
  const { categorie, lang } = await params
  const c = category(categorie)
  if (!c) notFound()
  return <Browse q={await searchParams} fixedCategory={c.value} lang={isLang(lang) ? lang : 'fr'} />
}

export default withSectionGate(AnnoncesCategorie, (p) => `/annonces/${p.categorie}`)
