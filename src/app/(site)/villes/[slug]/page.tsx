import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getShowcase, getWilayaPlaces, wilayaBySlug, type PlaceCard } from '@/modules/annuaire'
import { Carousel } from '@/platform/ui/Carousel'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const { cities } = await getShowcase()
  return cities.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const w = wilayaBySlug((await params).slug)
  return w ? { title: `${w.name} — que voir, que faire · DALIL`, description: `Les lieux à découvrir dans la wilaya de ${w.name}, avec leurs sources et leur statut de vérification.` } : {}
}

const STATUS: Record<string, string> = { spotted: 'À vérifier', checking: 'En vérification', verified: 'Vérifiée DALIL', labelled: 'Label Excellence' }

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
          <Carousel label={category}>
            {list.map((p, i) => (
              <Link key={p.slug} href={`/adresses/${p.slug}`} className="place-tile" data-reveal style={{ ['--i' as string]: i % 6 }}>
                <div className="place-tile-img" style={{ backgroundImage: `url(${p.photo})` }} />
                <div className="place-tile-body">
                  <span className="chip">{p.category}</span>
                  <h3>{p.name}</h3>
                  <p>{p.city}</p>
                  <small className={`status-dot status-${p.status}`}>{STATUS[p.status]}</small>
                </div>
              </Link>
            ))}
          </Carousel>
        </section>
      ))}
    </div>
  )
}
