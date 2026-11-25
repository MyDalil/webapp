import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { notFound } from 'next/navigation'
import { SECTORS } from '@/platform/referentiel/catalog'
import { getPlaceCounts, searchPlaces } from '@/modules/annuaire'
import { CategoryTiles, Directory } from '@/modules/annuaire/ui'
import { withSectionGate } from '@/platform/ui/SectionGate'

type Props = { params: Promise<{ sector: string }> }

export const revalidate = 604800 // 7 jours : la publication rafraîchit déjà la page à la demande (offre gratuite Vercel)
export const dynamicParams = false
export const generateStaticParams = () => SECTORS.map((s) => ({ sector: s.slug }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector } = await params
  const s = SECTORS.find((x) => x.slug === sector)
  return s ? { title: `${s.title} — Annuaire`, description: s.description } : {}
}

async function SectorPage({ params }: Props) {
  const { sector } = await params
  const s = SECTORS.find((x) => x.slug === sector)
  if (!s) notFound()
  const { places, total } = await searchPlaces({ sector: s.slug })
  const counts = await getPlaceCounts()
  return (
    <>
      <section className="page-intro container compact">
        <p className="eyebrow">
          <Link href="/annuaire">Annuaire &amp; Adresses</Link> › {s.title}
        </p>
        <h1>{s.title}</h1>
        <p>{s.description}</p>
        <CategoryTiles counts={counts.category} sector={s.slug} categories={s.categories} />
      </section>
      <Directory places={places} total={total} sectors={[{ slug: s.slug, title: s.title, categories: s.categories }]} initialSector={s.slug} lockSector />
    </>
  )
}

export default withSectionGate(SectorPage, (p) => `/annuaire/${p.sector}`)
