import { isLang } from '@/platform/i18n'
import type { Metadata } from 'next'
import { Browse, type BrowseQuery } from './Browse'
import { withSectionGate } from '@/platform/ui/SectionGate'

export const metadata: Metadata = { title: 'Services à domicile', description: 'Ménage, bricolage, garde d’enfants, cours coraniques, coach sportif… Décrivez votre besoin : DALIL vous indique les professionnels disponibles dans votre zone.' }
export const dynamic = 'force-dynamic'

async function Services({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<BrowseQuery> }) {
  const { lang } = await params
  return <Browse q={await searchParams} lang={isLang(lang) ? lang : 'fr'} />
}

export default withSectionGate(Services, () => '/services')
