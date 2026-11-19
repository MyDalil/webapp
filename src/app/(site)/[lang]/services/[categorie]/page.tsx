import { isLang } from '@/platform/i18n'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { category } from '@/modules/services'
import { Browse, type BrowseQuery } from '../Browse'
import { withSectionGate } from '@/platform/ui/SectionGate'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ categorie: string; lang: string }>; searchParams: Promise<BrowseQuery> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = category((await params).categorie)
  return c ? { title: `${c.label} · Services à domicile`, description: `${c.activities.map(([, l]) => l).join(', ')}. Identité et statut légal des prestataires contrôlés avant publication.` } : {}
}

async function ServiceCategory({ params, searchParams }: Props) {
  const { categorie, lang } = await params
  const c = category(categorie)
  if (!c) notFound()
  return <Browse q={await searchParams} fixedCategory={c.value} lang={isLang(lang) ? lang : 'fr'} />
}

export default withSectionGate(ServiceCategory, (p) => `/services/${p.categorie}`)
