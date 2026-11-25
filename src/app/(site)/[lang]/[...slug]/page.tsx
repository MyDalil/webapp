import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { firstHeading, firstParagraph, getPage, ROUTES } from '@/modules/contenus'
import { Tree } from '@/modules/contenus/ui'

type Props = { params: Promise<{ slug: string[] }> }

const routeOf = (slug: string[]) => '/' + slug.map(decodeURIComponent).join('/')

export const dynamicParams = false
// Le bloc d’accompagnement suit les réglages de /admin : page recalculée au plus toutes les heures.
export const revalidate = 604800 // 7 jours : la publication rafraîchit déjà la page à la demande (offre gratuite Vercel)

/** Routes ayant une page dédiée au format de la maquette. */
const DEDICATED = ['/', '/en', '/ar', '/recherche', '/annuaire', '/label', '/proposer', '/installation', '/explorer', '/vie-pratique', '/business-emploi', '/demarches']

export function generateStaticParams() {
  return ROUTES.filter((r) => !DEDICATED.includes(r) && !r.startsWith('/adresses/') && !r.startsWith('/annuaire/') && r !== '/guides' && !r.startsWith('/guides/')).map((r) => ({ slug: r.slice(1).split('/') }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPage(routeOf((await params).slug))
  if (!page) return {}
  // Un titre distinct par page, la marque une seule fois (ajoutée par le gabarit) : jamais « DALIL · DALIL » (audit SEO).
  const route = routeOf((await params).slug)
  const heading = (firstHeading(page.content) ?? '').replace(/\s*[·|—–-]\s*DALIL\s*$/i, '').replace(/^\s*DALIL\s*[·|—–:-]\s*/i, '').trim()
  const fallback = route.split('/').filter(Boolean).pop()?.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()) ?? null
  return { title: heading && !/^dalil$/i.test(heading) ? heading : fallback ?? undefined, description: firstParagraph(page.content) ?? undefined }
}

export default async function LegacyPage({ params }: Props) {
  const route = routeOf((await params).slug)
  const page = await getPage(route)
  if (!page) notFound()
  return (
    <>
      <div className="legacy">
        <Tree nodes={page.content} />
      </div>
    </>
  )
}
