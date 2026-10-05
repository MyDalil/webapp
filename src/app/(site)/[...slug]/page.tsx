import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { firstHeading, firstParagraph, getPage, ROUTES } from '@/content'
import { Tree } from '@/components/Tree'

type Props = { params: Promise<{ slug: string[] }> }

const routeOf = (slug: string[]) => '/' + slug.map(decodeURIComponent).join('/')

export const dynamicParams = false

/** Routes ayant une page dédiée au format de la maquette. */
const DEDICATED = ['/', '/recherche', '/annuaire', '/label', '/proposer', '/installation', '/espace']

export function generateStaticParams() {
  return ROUTES.filter((r) => !DEDICATED.includes(r) && !r.startsWith('/adresses/')).map((r) => ({ slug: r.slice(1).split('/') }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPage(routeOf((await params).slug))
  if (!page) return {}
  return { title: firstHeading(page.content) ?? undefined, description: firstParagraph(page.content) ?? undefined }
}

export default async function LegacyPage({ params }: Props) {
  const route = routeOf((await params).slug)
  const page = await getPage(route)
  if (!page) notFound()
  return (
    <div className="legacy">
      <Tree nodes={page.content} />
    </div>
  )
}
