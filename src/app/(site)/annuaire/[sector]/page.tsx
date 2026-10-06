import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SECTORS } from '@/content/catalog'
import { getPlaces } from '@/lib/places'
import { Directory } from '@/components/Directory'

type Props = { params: Promise<{ sector: string }> }

export const revalidate = 300
export const dynamicParams = false
export const generateStaticParams = () => SECTORS.map((s) => ({ sector: s.slug }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector } = await params
  const s = SECTORS.find((x) => x.slug === sector)
  return s ? { title: `${s.title} — Annuaire`, description: s.description } : {}
}

export default async function SectorPage({ params }: Props) {
  const { sector } = await params
  const s = SECTORS.find((x) => x.slug === sector)
  if (!s) notFound()
  const places = (await getPlaces()).filter((p) => p.sector === s.slug)
  return (
    <>
      <section className="page-intro container compact">
        <p className="eyebrow">
          <Link href="/annuaire">Annuaire &amp; Adresses</Link> › {s.title}
        </p>
        <h1>{s.title}</h1>
        <p>{s.description}</p>
      </section>
      <Directory places={places} sectors={[{ slug: s.slug, title: s.title, categories: s.categories }]} initialSector={s.slug} lockSector />
    </>
  )
}
