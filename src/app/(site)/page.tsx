import Link from 'next/link'
import { getFeaturedDestination, getPlaces, getShowcase, NATURE_CATEGORIES, PLACE_TYPES, type PlaceCard } from '@/modules/annuaire'
import { HomeEntries, type EntryPhotos, type EntryStat } from '@/modules/annuaire/ui'
import { HomeSearch } from '@/modules/recherche/ui'
import { NewsletterForm } from '@/modules/communication/ui'
import { Carousel } from '@/platform/ui/Carousel'
import { Slideshow } from '@/platform/ui/Slideshow'
import { Icon } from '@/platform/ui/Icon'
import { GUIDES } from '@/platform/referentiel/catalog'

export const revalidate = 300

const ENVIES = [
  ['Monuments et sites historiques', 'Monuments & histoire', 'culture-nature-loisirs'],
  ['Sites archéologiques', 'Cités antiques', 'culture-nature-loisirs'],
  ['Mosquées', 'Mosquées remarquables', 'mosquees-priere'],
  ['Musées', 'Musées', 'culture-nature-loisirs'],
  ['Parcs naturels et réserves', 'Grands espaces', 'culture-nature-loisirs'],
  ['Cascades, gorges et grottes', 'Gorges, grottes & cascades', 'culture-nature-loisirs'],
  ['Lacs et oasis', 'Lacs, chotts & oasis', 'culture-nature-loisirs'],
  ['Plages', 'Plages', 'culture-nature-loisirs'],
] as const

const STATUS: Record<string, string> = { spotted: 'À vérifier', checking: 'En vérification', verified: 'Vérifiée DALIL', labelled: 'Label Excellence' }

function PlaceTile({ p, i }: { p: PlaceCard; i: number }) {
  return (
    <Link href={`/adresses/${p.slug}`} className="city-tile top-tile" data-reveal style={{ ['--i' as string]: i % 6 }}>
      <div className="city-tile-img" style={{ backgroundImage: `url(${p.photo})` }} />
      <div className="city-tile-body">
        <span className="chip">{p.category}</span>
        <h3>{p.name}</h3>
        <p>
          {p.city}
          {p.wilaya && p.wilaya !== p.city ? ` · ${p.wilaya}` : ''}
        </p>
        <small className={`status-dot status-${p.status}`}>{STATUS[p.status]}</small>
      </div>
    </Link>
  )
}

export default async function Home() {
  const [{ top, cities, total }, all, destination] = await Promise.all([getShowcase(), getPlaces(), getFeaturedDestination()])
  const lit = all.filter((p) => p.cover && !p.cover.startsWith('/mockup'))
  // Nombre de lieux publiés et un exemple illustré (photo de la fiche, avec son crédit) ; jamais deux fois le même exemple.
  const used = new Set<string>()
  const stat = (ok: (p: PlaceCard) => boolean, prefer: (p: PlaceCard) => boolean = () => true): EntryStat => {
    const list = all.filter(ok)
    const first = list.find((p) => lit.includes(p) && prefer(p) && !used.has(p.slug)) ?? list.find((p) => lit.includes(p) && !used.has(p.slug))
    if (first) used.add(first.slug)
    return { photo: first ? { src: first.cover, credit: first.credit } : null, count: list.length, example: first?.name ?? null }
  }
  const WEEKEND = new Set([...PLACE_TYPES.famille, ...PLACE_TYPES.nature, ...PLACE_TYPES.culture])
  const photos: EntryPhotos = {
    coeur: stat((p) => p.favorite),
    // Mêmes photos qu’avant pour chaque entrée (jardins et activités familiales, monuments, plages et parcs…).
    weekend: stat((p) => WEEKEND.has(p.category), (p) => p.category === 'Jardins' || p.category === 'Activités familiales'),
    decouvrir: stat((p) => p.sector === 'culture-nature-loisirs', (p) => p.category === 'Monuments et sites historiques'),
    nature: stat((p) => (NATURE_CATEGORIES as readonly string[]).includes(p.category), (p) => p.category === 'Plages' || p.category === 'Parcs naturels et réserves'),
    adresses: stat(() => true, (p) => p.sector === 'restaurants-gastronomie'),
    quotidien: stat((p) => ['sante-soins', 'administrations-services-publics', 'commerces-achats', 'transports-mobilite'].includes(p.sector), (p) => p.sector === 'commerces-achats' || p.category === 'Marchés'),
  }
  // Pas encore de coup de cœur : la vignette garde une photo (un lieu à l’affiche, non utilisé ailleurs).
  if (!photos.coeur.photo) {
    const p = top.find((x) => !used.has(x.slug)) ?? top[0]
    if (p) photos.coeur = { ...photos.coeur, photo: { src: p.cover, credit: p.credit } }
  }
  const slides = top.slice(0, 6).map((p) => ({ src: p.cover, title: p.name, place: `${p.city} · ${p.category}`, href: `/adresses/${p.slug}`, credit: p.credit }))
  const byCategory = (c: string) => top.concat([]).find((p) => p.category === c)
  return (
    <div className="xp">
      <section className="xp-hero">
        <Slideshow slides={slides} />
        <div className="xp-hero-shade" />
        <div className="xp-hero-content container">
          <p className="eyebrow inverse">Votre guide de l’Algérie</p>
          <h1>L’Algérie, plus proche de vous.</h1>
          <p className="xp-lead">Découvrez, préparez, vivez, partagez.</p>
          <HomeSearch />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">À votre rythme</p>
              <h2>Que souhaitez-vous faire aujourd’hui ?</h2>
            </div>
          </div>
        </div>
        <HomeEntries stats={photos} total={total} cities={cities.map(({ name, slug, cover, credit, count, highlight }) => ({ name, slug, cover, credit, count, highlight }))} />
      </section>

      <section className="section xp-band">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">Les incontournables</p>
              <h2>Des lieux qui méritent votre temps.</h2>
              <p>{total} lieux référencés, avec leurs sources et leur statut de vérification.</p>
            </div>
            <Link className="button outline" href="/annuaire">
              Voir tout l’annuaire
            </Link>
          </div>
        </div>
        <Carousel label="Lieux incontournables" variant="tiles">
          {top.map((p, i) => (
            <PlaceTile key={p.slug} p={p} i={i} />
          ))}
        </Carousel>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">Par ville</p>
              <h2>Choisissez votre point de départ.</h2>
            </div>
          </div>
        </div>
        <Carousel label="Villes et wilayas" variant="tiles">
          {cities.map((c, i) => (
            <Link key={c.slug} href={`/villes/${c.slug}`} className="city-tile" data-reveal style={{ ['--i' as string]: i % 6 }}>
              <div className="city-tile-img" style={{ backgroundImage: `url(${c.cover})` }} />
              <div className="city-tile-body">
                <h3>{c.name}</h3>
                <p>
                  {c.count} lieu{c.count > 1 ? 'x' : ''} · {c.highlight}
                </p>
              </div>
            </Link>
          ))}
        </Carousel>
      </section>

      {destination && (
        <section className="xp-parallax" aria-label={destination.place.name}>
          <div className="xp-parallax-img" data-parallax="0.18" style={{ backgroundImage: `url(${destination.place.cover})` }} />
          <div className="xp-parallax-shade" />
          <div className="container xp-parallax-content" data-reveal>
            <p className="eyebrow inverse">{destination.eyebrow}</p>
            <h2>{destination.title}</h2>
            <p>{destination.text}</p>
            <Link className="button light" href={`/adresses/${destination.place.slug}`}>
              {destination.cta}
            </Link>
          </div>
          {destination.place.credit && <small className="xp-credit">{destination.place.credit}</small>}
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">Par envie</p>
              <h2>Ce qui vous inspire aujourd’hui.</h2>
            </div>
          </div>
        </div>
        <Carousel label="Catégories" variant="tiles">
          {ENVIES.map(([category, label, sector], i) => {
            const p = byCategory(category)
            return (
              <Link key={category} href={`/annuaire/${sector}?category=${encodeURIComponent(category)}`} className="city-tile envie-tile" data-reveal style={{ ['--i' as string]: i % 6 }}>
                <div className="city-tile-img" style={p ? { backgroundImage: `url(${p.photo})` } : undefined} />
                <div className="city-tile-body">
                  <h3>{label}</h3>
                  {p && <p>Ex. {p.name}</p>}
                </div>
              </Link>
            )
          })}
        </Carousel>
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">Guides pratiques</p>
              <h2>Les repères pour avancer à votre rythme.</h2>
            </div>
            <Link className="button outline" href="/guides">
              Tous les guides
            </Link>
          </div>
        </div>
        <Carousel label="Guides" variant="wide">
          {GUIDES.map((g, i) => (
            <Link key={g.slug} href={`/guides/${g.slug}`} className="guide-tile" data-reveal style={{ ['--i' as string]: i % 6 }}>
              <span className="chip">{g.category}</span>
              <h3>{g.title}</h3>
              <p>{g.summary}</p>
              <b>
                Lire le guide <Icon name="arrow" />
              </b>
            </Link>
          ))}
        </Carousel>
      </section>

      <section className="section container xp-split" data-reveal>
        <div>
          <p className="eyebrow">Portail d’installation</p>
          <h2>Votre installation, étape par étape.</h2>
          <p>Repérez les démarches utiles, préparez votre arrivée et retrouvez les guides adaptés à votre situation, que vous partiez seul ou en famille.</p>
          <div className="xp-actions">
            <Link className="button primary" href="/installation">
              Commencer
            </Link>
            <Link className="button outline" href="/diagnostic">
              Créer mon parcours
            </Link>
          </div>
        </div>
        <div>
          <p className="eyebrow">Professionnels</p>
          <h2>Présentez votre établissement.</h2>
          <p>Revendiquez votre fiche, répondez aux demandes et aux avis. La vérification DALIL reste indépendante de tout abonnement.</p>
          <div className="xp-actions">
            <Link className="button primary" href="/professionnels/rejoindre">
              Rejoindre l’annuaire
            </Link>
            <Link className="button outline" href="/label">
              Le label DALIL
            </Link>
          </div>
        </div>
      </section>

      <section className="xp-community">
        <div className="container" data-reveal>
          <div>
            <p className="eyebrow inverse">Communauté DALIL</p>
            <h2>Recevez les nouveaux lieux et les guides du mois.</h2>
          </div>
          <NewsletterForm />
        </div>
      </section>
    </div>
  )
}
