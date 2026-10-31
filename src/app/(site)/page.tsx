import { GUIDE_VISUALS } from '@/modules/contenus'
import Link from 'next/link'
import {
  cityPhoto,
  getFeaturedDestination,
  getPlaceCounts,
  getPlaces,
  getShowcase,
  type PlaceCard,
} from '@/modules/annuaire'
import { HomeEntries, type EntryPhotos, type EntryStat } from '@/modules/annuaire/ui'
import { HomeSearch } from '@/modules/recherche/ui'
import { NewsletterForm } from '@/modules/communication/ui'
import { CATEGORIES as CLASSIFIED_CATEGORIES, classifiedCounts, searchClassifieds } from '@/modules/annonces'
import { Carousel } from '@/platform/ui/Carousel'
import { ParallaxBand, SectionHead, TileCarousel, type Tile } from '@/platform/ui/Xp'
import { PHOTOS, type PhotoKey } from '@/platform/referentiel/photos'
import { Slideshow } from '@/platform/ui/Slideshow'
import { Icon } from '@/platform/ui/Icon'
import { GUIDES } from '@/platform/referentiel/catalog'
import { RUBRICS } from '@/platform/shell/nav'

export const revalidate = 3600

/**
 * Accueil (ordre validé par Rad, 2026-10-21) : Vie musulmane, Services — Santé en tête —, Découvrir,
 * Démarches, Annonces, Vivre en Algérie.
 */
const ENVIES = [
  ['Monuments et sites historiques', 'Monuments & histoire', 'culture-nature-loisirs'],
  ['Sites archéologiques', 'Cités antiques', 'culture-nature-loisirs'],
  ['Musées', 'Musées', 'culture-nature-loisirs'],
  ['Parcs naturels et réserves', 'Grands espaces', 'culture-nature-loisirs'],
  ['Cascades, gorges et grottes', 'Gorges, grottes & cascades', 'culture-nature-loisirs'],
  ['Lacs et oasis', 'Lacs, chotts & oasis', 'culture-nature-loisirs'],
  ['Plages', 'Plages', 'culture-nature-loisirs'],
] as const

/** Santé d’abord : les spécialités les plus demandées, chacune ouvre la liste des praticiens filtrée. */
const DEMARCHES = ['documents-et-demarches', 'travail-et-entreprise', 'preparer-son-installation']
const VIVRE = ['logement', 'ecole-et-famille', 'budget-et-banque']


const ANNONCE_PHOTO: Record<string, PhotoKey> = { immobilier: 'alger-ville', emploi: 'oran-panorama', vehicules: 'annonces-vehicules', objets: 'marche' }

function GuideTiles({ slugs, label }: { slugs: string[]; label: string }) {
  const list = slugs.map((s) => GUIDES.find((g) => g.slug === s)).filter((g) => g !== undefined)
  return (
    <TileCarousel
      label={label}
      tiles={list.map((g): Tile => {
        const v = GUIDE_VISUALS[g.slug]
        return { href: `/guides/${g.slug}`, title: g.title, sub: g.summary, chip: g.category, photo: v?.photo ? PHOTOS[v.photo].src : PHOTOS['alger-mer'].src, icon: v?.icon ?? 'file' }
      })}
    />
  )
}

const MUSULMANE_PHOTO: Record<string, string> = { 'Hajj & Omra': PHOTOS.kaaba.src, 'Enseignement coranique': PHOTOS.coran.src, 'Librairies islamiques': PHOTOS['librairie-islamique'].src, 'Entraide & associations': PHOTOS.iftar.src, 'Funérailles musulmanes': PHOTOS.cimetiere.src }

export default async function Home() {
  const [{ top, cities }, all, destination, counts, latest, classified] = await Promise.all([
    getShowcase(),
    getPlaces(),
    getFeaturedDestination(),
    getPlaceCounts(),
    searchClassifieds({}, 12),
    classifiedCounts(),
  ])
  const inSectors = (sectors: string[]) => sectors.reduce((n, x) => n + (counts.sector[x] ?? 0), 0)
  // Photo propre à la fiche (pas la photo de repli de sa ville), seule admise dans le diaporama et les portes.
  const own = (p: PlaceCard) =>
    p.cover &&
    !p.cover.startsWith('/mockup') &&
    !p.cover.startsWith('/images/') &&
    p.cover !== cityPhoto(p.city)
  const used = new Set<string>()
  const pick = (ok: (p: PlaceCard) => boolean, prefer: (p: PlaceCard) => boolean = () => true) => {
    const p =
      all.find((x) => ok(x) && own(x) && prefer(x) && !used.has(x.slug)) ??
      all.find((x) => ok(x) && own(x) && !used.has(x.slug))
    if (p) used.add(p.slug)
    return p
  }
  const inSector =
    (...s: string[]) =>
    (p: PlaceCard) =>
      s.includes(p.sector)

  // Diaporama mixte : une mosquée, un lieu de santé, une sortie, un bureau officiel, puis les incontournables.
  const mixed = [
    pick(inSector('mosquees-priere'), (p) => p.category === 'Mosquées'),
    pick(inSector('sante-soins')),
    pick(
      inSector('culture-nature-loisirs'),
      (p) => p.category === 'Monuments et sites historiques',
    ),
    pick(inSector('administrations-services-publics')),
  ].filter((p) => p !== undefined)
  const slidePlaces = [...mixed, ...top.filter((p) => !used.has(p.slug))].slice(0, 6)
  slidePlaces.forEach((p) => used.add(p.slug))
  const slides = slidePlaces.map((p) => ({
    src: p.cover,
    title: p.name,
    place: `${p.city} · ${p.category}`,
    href: `/adresses/${p.slug}`,
    credit: p.credit,
  }))

  const door = (sectors: string[], prefer?: (p: PlaceCard) => boolean): EntryStat => {
    const p = pick(inSector(...sectors), prefer)
    return {
      photo: p ? { src: p.cover, credit: p.credit } : null,
      count: inSectors(sectors),
      example: p?.name ?? null,
    }
  }
  const city = cities[0]
  const photos: EntryPhotos = {
    musulmane: door(['mosquees-priere'], (p) => p.category === 'Mosquées'),
    // Portes Services et Démarches : photo choisie qui montre le sujet (pas une fiche au hasard).
    services: { ...door(['sante-soins', 'maison-travaux', 'droit-finance-conseil', 'transports-mobilite']), photo: { src: PHOTOS['hopital-moderne'].src, credit: PHOTOS['hopital-moderne'].credit }, example: null },
    decouvrir: door(['culture-nature-loisirs', 'restaurants-gastronomie']),
    demarches: { ...door(['administrations-services-publics']), photo: { src: PHOTOS['grande-poste'].src, credit: PHOTOS['grande-poste'].credit }, example: null },
    annonces: (() => {
      const c = latest.find((x) => x.photo)
      return { photo: c?.photo ? { src: c.photo, credit: null } : { src: PHOTOS['alger-ville'].src, credit: PHOTOS['alger-ville'].credit }, count: classified.total, example: null }
    })(),
    vivre: {
      photo: city ? { src: city.cover, credit: city.credit } : { src: PHOTOS['alger-mer'].src, credit: PHOTOS['alger-mer'].credit },
      count: 0,
      example: null,
    },
  }
  const byCategory = (c: string) =>
    top.find((p) => p.category === c) ?? all.find((p) => p.category === c && own(p))
  const musulmane = RUBRICS.find((r) => r.key === 'musulmane')

  return (
    <div className="xp">
      <section className="xp-hero">
        <Slideshow slides={slides} />
        <div className="xp-hero-shade" />
        <div className="xp-hero-content container">
          <p className="eyebrow inverse">Guide & Services en Algérie</p>
          <h1>L’Algérie, plus proche de vous.</h1>
          <p className="xp-lead">
            Mosquées, médecins, artisans, sorties, démarches, annonces : tout au même endroit.
          </p>
          <HomeSearch />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">Les rubriques</p>
              <h2>Que souhaitez-vous faire aujourd’hui ?</h2>
            </div>
          </div>
        </div>
        <HomeEntries stats={photos} />
      </section>

      {musulmane && (
        <section className="section section-tint">
          <div className="container">
            <div className="section-head" data-reveal>
              <div>
                <p className="eyebrow">Vie musulmane</p>
                <h2>Prier, apprendre, s’entraider.</h2>
              </div>
            </div>
          </div>
          <TileCarousel
            label="Vie musulmane"
            tiles={musulmane.entries.map(([href, icon, title, sub]): Tile => {
              const category = new URL(href, 'https://mydalil.com').searchParams.get('category')
              const p = category ? byCategory(category) : undefined
              // Photo propre au sujet, sinon photo libre choisie, sinon pictogramme (jamais une case vide).
              const own = p && !p.photo.startsWith('/images/lieu') && !p.photo.includes('/images/algeria/') ? p.photo : null
              return { href, title, sub, photo: MUSULMANE_PHOTO[title] ?? own ?? PHOTOS['djamaa-el-kebir'].src, icon }
            })}
          />
        </section>
      )}

      {/* Santé et À domicile en carrousels photo (Rad, 2026-10-31) : grandes tuiles regroupées, photos sans visage. */}
      <section className="section">
        <SectionHead eyebrow="Santé" title="Un médecin, sans attendre." />
        <TileCarousel
          label="Santé"
          tiles={[
            { href: '/praticiens?specialite=medecine-generale', title: 'Consultation', sub: 'Médecin généraliste, rendez-vous en ligne', photo: PHOTOS['sante-consultation'].src, icon: 'health' },
            { href: '/praticiens', title: 'Spécialistes', sub: 'Pédiatre, gynécologue, dentiste, ophtalmologue, kiné, psychologue', photo: PHOTOS['sante-specialistes'].src, icon: 'health' },
            { href: '/annuaire/sante-soins', title: 'Pharmacies & hôpitaux', sub: 'Pharmacies, cliniques, hôpitaux, laboratoires', photo: PHOTOS.pharmacie.src, icon: 'health' },
          ]}
        />
      </section>

      <section className="section section-tint">
        <SectionHead eyebrow="À domicile" title="Un pro chez vous, en confiance." />
        <TileCarousel
          label="À domicile"
          tiles={[
            { href: '/services/bricolage', title: 'Travaux', sub: 'Bricolage, déménagement, jardinage', photo: PHOTOS['domicile-travaux'].src, icon: 'briefcase' },
            { href: '/services/menage', title: 'Entretien', sub: 'Ménage, informatique', photo: PHOTOS['domicile-entretien'].src, icon: 'home' },
            { href: '/services/garde-enfants', title: 'Famille', sub: 'Garde d’enfants, aide à domicile, animaux', photo: PHOTOS['domicile-famille'].src, icon: 'users' },
            { href: '/services/cours-particuliers', title: 'Cours & sport', sub: 'Cours particuliers, cours coraniques, coach sportif', photo: PHOTOS['domicile-cours'].src, icon: 'school' },
          ]}
        />
      </section>

      <section className="section xp-band">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">Découvrir</p>
              <h2>Tourisme, sorties et divertissement.</h2>
            </div>
          </div>
        </div>
        <Carousel label="Par envie" variant="tiles">
          {ENVIES.map(([category, label, sector], i) => {
            const p = byCategory(category)
            return (
              <Link
                key={category}
                href={`/annuaire/${sector}?category=${encodeURIComponent(category)}`}
                className="city-tile envie-tile"
                data-reveal
                style={{ ['--i' as string]: i % 6 }}
              >
                <div
                  className="city-tile-img"
                  style={p ? { backgroundImage: `url(${p.photo})` } : undefined}
                />
                <div className="city-tile-body">
                  <h3>{label}</h3>
                  {p && <p>Ex. {p.name}</p>}
                </div>
              </Link>
            )
          })}
        </Carousel>
        <div className="container xp-subhead" data-reveal>
          <h3>Les incontournables</h3>
          <Link href="/que-faire-ce-week-end">Que faire ce week-end ?</Link>
        </div>
        <TileCarousel label="Lieux incontournables" tiles={top.slice(0, 10).map((p): Tile => ({ href: `/adresses/${p.slug}`, title: p.name, sub: p.city, chip: p.category, photo: p.cover, icon: 'pin' }))} />
        <div className="container xp-subhead" data-reveal>
          <h3>Par ville</h3>
        </div>
        <Carousel label="Villes et wilayas" variant="tiles">
          {cities.map((c, i) => (
            <Link
              key={c.slug}
              href={`/villes/${c.slug}`}
              className="city-tile"
              data-reveal
              style={{ ['--i' as string]: i % 6 }}
            >
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
          <div
            className="xp-parallax-img"
            data-parallax="0.18"
            style={{ backgroundImage: `url(${destination.place.cover})` }}
          />
          <div className="xp-parallax-shade" />
          <div className="container xp-parallax-content" data-reveal>
            <p className="eyebrow inverse">{destination.eyebrow}</p>
            <h2>{destination.title}</h2>
            <p>{destination.text}</p>
            <Link className="button light" href={`/adresses/${destination.place.slug}`}>
              {destination.cta}
            </Link>
          </div>
          {destination.place.credit && (
            <small className="xp-credit">{destination.place.credit}</small>
          )}
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">Démarches</p>
              <h2>Vos papiers, étape par étape.</h2>
            </div>
          </div>
        </div>
        <GuideTiles slugs={DEMARCHES} label="Guides des démarches" />
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">Annonces</p>
              <h2>Immobilier, emploi, véhicules, objets.</h2>
              <p>Chaque annonce est contrôlée par l’équipe DALIL avant publication.</p>
            </div>
            <Link className="button primary" href="/annonces/deposer">
              Déposer une annonce
            </Link>
          </div>
        </div>
        <TileCarousel
          label="Annonces"
          tiles={CLASSIFIED_CATEGORIES.map(
            (c): Tile => ({
              href: `/annonces/${c.value}`,
              title: c.label,
              sub: `${c.subs.slice(0, 3).map(([, l]) => l).join(' · ')} — ${classified.byCategory[c.value] ? `${classified.byCategory[c.value]} annonce${classified.byCategory[c.value] > 1 ? 's' : ''}` : 'soyez le premier à publier'}`,
              photo: PHOTOS[ANNONCE_PHOTO[c.value] ?? 'alger-ville'].src,
              icon: 'grid',
            }),
          )}
        />
        {!!latest.length && (
          <>
            <div className="container xp-subhead" data-reveal>
              <h3>Dernières annonces</h3>
              <Link href="/annonces">Toutes les annonces</Link>
            </div>
            <Carousel label="Dernières annonces" variant="tiles">
              {latest.map((c, i) => (
                <Link key={c.id} href={c.href} className="city-tile top-tile" data-reveal style={{ ['--i' as string]: i % 6 }}>
                  {c.photo ? (
                    <div className="city-tile-img" style={{ backgroundImage: `url(${c.photo})` }} />
                  ) : (
                    <div className="city-tile-img is-icon is-annonce">
                      <span className="xp-tile-icon" aria-hidden="true">
                        <Icon name={({ immobilier: 'home', emploi: 'briefcase', vehicules: 'car' } as Record<string, string>)[c.category] ?? 'grid'} />
                      </span>
                    </div>
                  )}
                  <div className="city-tile-body">
                    <span className="chip">{c.example ? `Exemple · ${c.subLabel}` : c.subLabel}</span>
                    <h3>{c.title}</h3>
                    <p>
                      {c.price} · {c.place}
                    </p>
                  </div>
                </Link>
              ))}
            </Carousel>
          </>
        )}
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">Vivre en Algérie</p>
              <h2>Logement, école, banque : les repères.</h2>
            </div>
          </div>
        </div>
        <GuideTiles slugs={VIVRE} label="Guides de la vie pratique" />
      </section>

      <ParallaxBand photo={PHOTOS['ghardaia-marche'].src} credit={PHOTOS['ghardaia-marche'].credit} eyebrow="Professionnels" title="Présentez votre établissement." text="Revendiquez votre fiche, répondez aux demandes et aux avis. La vérification DALIL reste indépendante de tout abonnement.">
        <div className="xp-actions">
          <Link className="button primary" href="/professionnels/rejoindre">
            Rejoindre l’annuaire
          </Link>
          <Link className="button light" href="/label">
            Le label DALIL
          </Link>
        </div>
      </ParallaxBand>

      <ParallaxBand photo={PHOTOS['alger-mer'].src} credit={PHOTOS['alger-mer'].credit} eyebrow="Portail d’installation" title="Votre installation, étape par étape." text="Repérez les démarches utiles, préparez votre arrivée et retrouvez les guides adaptés à votre situation, que vous partiez seul ou en famille.">
        <div className="xp-actions">
          <Link className="button primary" href="/installation">
            Commencer
          </Link>
          <Link className="button light" href="/diagnostic">
            Créer mon parcours
          </Link>
        </div>
      </ParallaxBand>

      <section className="xp-community">
        <div className="container" data-reveal>
          <div>
            <p className="eyebrow inverse">Communauté DALIL</p>
            <h2>Recevez les nouveautés et les guides du mois.</h2>
          </div>
          <NewsletterForm />
        </div>
      </section>
    </div>
  )
}
