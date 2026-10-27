import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { firstHeading, firstParagraph, getPage, ROUTES } from '@/modules/contenus'
import { Tree } from '@/modules/contenus/ui'
import { offerState, packForGuide } from '@/modules/accompagnement'
import { Choice, Transparency } from '@/modules/accompagnement/ui'

type Props = { params: Promise<{ slug: string[] }> }

const routeOf = (slug: string[]) => '/' + slug.map(decodeURIComponent).join('/')

export const dynamicParams = false
// Le bloc d’accompagnement suit les réglages de /admin : page recalculée au plus toutes les heures.
export const revalidate = 3600

/** Routes ayant une page dédiée au format de la maquette. */
const DEDICATED = ['/', '/recherche', '/annuaire', '/label', '/proposer', '/installation', '/explorer', '/vie-pratique', '/business-emploi', '/demarches']

export function generateStaticParams() {
  return ROUTES.filter((r) => !DEDICATED.includes(r) && !r.startsWith('/adresses/') && !r.startsWith('/annuaire/') && r !== '/guides' && !r.startsWith('/guides/')).map((r) => ({ slug: r.slice(1).split('/') }))
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
  // Guides : deux options (guide gratuit / pack d’accompagnement) quand l’offre est visible.
  const pack = route.startsWith('/guides/') ? await packForGuide(route) : null
  const open = pack ? (await offerState()).mode === 'ouvert' : false
  return (
    <>
      <div className="legacy">
        <Tree nodes={page.content} />
      </div>
      {pack && (
        <section className="sr ac-page ac-after-guide" aria-label="Accompagnement">
          <Transparency />
          <Choice pack={pack} freeHref={route} open={open} freeNote="Vous lisez le guide gratuit : toutes les étapes et les liens officiels sont ci-dessus." />
        </section>
      )}
    </>
  )
}
