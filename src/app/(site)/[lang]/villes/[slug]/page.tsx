import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { notFound } from 'next/navigation'
import { getShowcase, getWilayaPlaces, wilayaBySlug, type PlaceCard } from '@/modules/annuaire'
import { PlacePanel } from '@/modules/annuaire/ui'
import { categoryPath } from '@/platform/referentiel/slug'
import { SECTORS } from '@/platform/referentiel/catalog'

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const { cities } = await getShowcase()
  return cities.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const w = wilayaBySlug((await params).slug)
  return w ? { title: `${w.name} — que voir, que faire · DALIL`, description: `Les lieux à découvrir dans la wilaya de ${w.name}, avec leurs sources et leur statut de vérification.` } : {}
}

export default async function City({ params }: Props) {
  const w = wilayaBySlug((await params).slug)
  if (!w) notFound()
  const places = await getWilayaPlaces(w.name)
  if (!places.length) notFound()
  const hero = places[0]
  const groups = new Map<string, PlaceCard[]>()
  for (const p of places) groups.set(p.category, [...(groups.get(p.category) ?? []), p])
  return (
    <div className="xp">
      <section className="xp-hero xp-hero-city">
        <div className="xp-hero-img" data-parallax="0.12" style={{ backgroundImage: `url(${hero.cover})` }} />
        <div className="xp-hero-shade" />
        <div className="xp-hero-content container">
          <Link className="back-link inverse" href="/annuaire">
            ← Annuaire
          </Link>
          <p className="eyebrow inverse">Wilaya {String(w.code).padStart(2, '0')}</p>
          <h1>{w.name}</h1>
          <p className="xp-lead">
            {places.length} lieu{places.length > 1 ? 'x' : ''} à découvrir, classés selon la règle DALIL.
          </p>
        </div>
        {hero.credit && <small className="xp-credit">{hero.credit}</small>}
      </section>
      {[...groups.entries()].map(([category, list]) => (
        <section key={category} className="section">
          <div className="container">
            <div className="section-head" data-reveal>
              <div>
                <h2>{category}</h2>
                <p>
                  {list.length} lieu{list.length > 1 ? 'x' : ''}
                </p>
              </div>
            </div>
          </div>
          <PlacePanel places={list.slice(0, 8)} more={SECTORS.find((x) => x.slug === list[0]?.sector)?.categories.includes(category) ? { href: categoryPath(list[0].sector, category, w.code), label: list.length > 8 ? `Les ${list.length} adresses « ${category} »` : `${category} : voir sur la carte` } : undefined} />
        </section>
      ))}
    </div>
  )
}
