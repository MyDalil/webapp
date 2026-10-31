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
import { categoryLabel, count, type Lang } from '@/platform/i18n'
import { HOME_T, CLASSIFIED_T, GUIDE_T, DESTINATION_DEFAULT, MUSULMANE_T } from './homeText'

/**
 * Accueil (ordre validé par Rad, 2026-10-21) : Vie musulmane, Services — Santé en tête —, Découvrir,
 * Démarches, Annonces, Vivre en Algérie.
 */
const ENVIES = [
  ['Monuments et sites historiques', 'culture-nature-loisirs'],
  ['Sites archéologiques', 'culture-nature-loisirs'],
  ['Musées', 'culture-nature-loisirs'],
  ['Parcs naturels et réserves', 'culture-nature-loisirs'],
  ['Cascades, gorges et grottes', 'culture-nature-loisirs'],
  ['Lacs et oasis', 'culture-nature-loisirs'],
  ['Plages', 'culture-nature-loisirs'],
] as const

/** Santé d’abord : les spécialités les plus demandées, chacune ouvre la liste des praticiens filtrée. */
const DEMARCHES = ['documents-et-demarches', 'travail-et-entreprise', 'preparer-son-installation']
const VIVRE = ['logement', 'ecole-et-famille', 'budget-et-banque']


const ANNONCE_PHOTO: Record<string, PhotoKey> = { immobilier: 'alger-ville', emploi: 'oran-panorama', vehicules: 'annonces-vehicules', objets: 'marche' }

function GuideTiles({ slugs, label, lang }: { slugs: string[]; label: string; lang: Lang }) {
  const list = slugs.map((s) => GUIDES.find((g) => g.slug === s)).filter((g) => g !== undefined)
  return (
    <TileCarousel
      label={label}
      tiles={list.map((g): Tile => {
        const v = GUIDE_VISUALS[g.slug]
        const t = lang === 'fr' ? null : GUIDE_T[g.slug]?.[lang]
        return { href: `/guides/${g.slug}`, title: t?.[0] ?? g.title, sub: t?.[1] ?? g.summary, chip: t?.[2] ?? g.category, photo: v?.photo ? PHOTOS[v.photo].src : PHOTOS['alger-mer'].src, icon: v?.icon ?? 'file' }
      })}
    />
  )
}

const MUSULMANE_PHOTO: Record<string, string> = { 'Hajj & Omra': PHOTOS.kaaba.src, 'Enseignement coranique': PHOTOS.coran.src, 'Librairies islamiques': PHOTOS['librairie-islamique'].src, 'Entraide & associations': PHOTOS.iftar.src, 'Funérailles musulmanes': PHOTOS.cimetiere.src }

/** Accueil commun aux trois langues : mêmes sections, mêmes liens, mêmes photos (Rad, 2026-10-31). */

export async function HomeView({ lang }: { lang: Lang }) {
  const T = HOME_T[lang]
  const cat = (c: string) => categoryLabel(c, lang)
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
    place: `${p.city} · ${cat(p.category)}`,
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
  const ad = (fr: string) => (lang === 'fr' ? fr : (CLASSIFIED_T[fr]?.[lang] ?? fr))
  // Destination à la une : texte saisi dans /admin (français) ; traduit seulement s’il reste le texte par défaut.
  const dest = destination
    ? lang === 'fr' || destination.title !== DESTINATION_DEFAULT.fr.title
      ? destination
      : { ...DESTINATION_DEFAULT[lang], cta: DESTINATION_DEFAULT[lang].cta(destination.place.name) }
    : null

  return (
    <div className="xp" lang={lang} dir={lang === 'ar' ? 'rtl' : undefined}>
      <section className="xp-hero">
        <Slideshow slides={slides} />
        <div className="xp-hero-shade" />
        <div className="xp-hero-content container">
          <p className="eyebrow inverse">{T.heroEyebrow}</p>
          <h1>{T.heroTitle}</h1>
          <p className="xp-lead">{T.heroLead}</p>
          <HomeSearch lang={lang} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">{T.rubricsEyebrow}</p>
              <h2>{T.rubricsTitle}</h2>
            </div>
          </div>
        </div>
        <HomeEntries stats={photos} lang={lang} />
      </section>

      {musulmane && (
        <section className="section section-tint">
          <div className="container">
            <div className="section-head" data-reveal>
              <div>
                <p className="eyebrow">{T.musulmaneEyebrow}</p>
                <h2>{T.musulmaneTitle}</h2>
              </div>
            </div>
          </div>
          <TileCarousel
            label={T.musulmaneEyebrow}
            tiles={musulmane.entries.map(([href, icon, title, sub], i): Tile => {
              const category = new URL(href, 'https://mydalil.com').searchParams.get('category')
              const p = category ? byCategory(category) : undefined
              // Photo propre au sujet, sinon photo libre choisie, sinon pictogramme (jamais une case vide).
              const own = p && !p.photo.startsWith('/images/lieu') && !p.photo.includes('/images/algeria/') ? p.photo : null
              const t = lang === 'fr' ? null : MUSULMANE_T[lang][i]
              return { href, title: t?.[0] ?? title, sub: t?.[1] ?? sub, photo: MUSULMANE_PHOTO[title] ?? own ?? PHOTOS['djamaa-el-kebir'].src, icon }
            })}
          />
        </section>
      )}

      {/* Santé et À domicile en carrousels photo (Rad, 2026-10-31) : grandes tuiles regroupées, photos sans visage. */}
      <section className="section">
        <SectionHead eyebrow={T.santeEyebrow} title={T.santeTitle} />
        <TileCarousel
          label={T.santeEyebrow}
          tiles={[
            { href: '/praticiens?specialite=medecine-generale', title: T.sante[0][0], sub: T.sante[0][1], photo: PHOTOS['sante-consultation'].src, icon: 'health' },
            { href: '/praticiens', title: T.sante[1][0], sub: T.sante[1][1], photo: PHOTOS['sante-specialistes'].src, icon: 'health' },
            { href: '/annuaire/sante-soins', title: T.sante[2][0], sub: T.sante[2][1], photo: PHOTOS.pharmacie.src, icon: 'health' },
          ]}
        />
      </section>

      <section className="section section-tint">
        <SectionHead eyebrow={T.domicileEyebrow} title={T.domicileTitle} />
        <TileCarousel
          label={T.domicileEyebrow}
          tiles={[
            { href: '/services/bricolage', title: T.domicile[0][0], sub: T.domicile[0][1], photo: PHOTOS['domicile-travaux'].src, icon: 'briefcase' },
            { href: '/services/menage', title: T.domicile[1][0], sub: T.domicile[1][1], photo: PHOTOS['domicile-entretien'].src, icon: 'home' },
            { href: '/services/garde-enfants', title: T.domicile[2][0], sub: T.domicile[2][1], photo: PHOTOS['domicile-famille'].src, icon: 'users' },
            { href: '/services/cours-particuliers', title: T.domicile[3][0], sub: T.domicile[3][1], photo: PHOTOS['domicile-cours'].src, icon: 'school' },
          ]}
        />
      </section>

      <section className="section xp-band">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">{T.decouvrirEyebrow}</p>
              <h2>{T.decouvrirTitle}</h2>
            </div>
          </div>
        </div>
        <Carousel label={T.byInterest} variant="tiles">
          {ENVIES.map(([category, sector], i) => {
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
                  <h3>{T.envies[i]}</h3>
                  {p && <p>{T.example} {p.name}</p>}
                </div>
              </Link>
            )
          })}
        </Carousel>
        <div className="container xp-subhead" data-reveal>
          <h3>{T.mustSee}</h3>
          <Link href="/que-faire-ce-week-end">{T.weekend}</Link>
        </div>
        <TileCarousel label={T.mustSee} tiles={top.slice(0, 10).map((p): Tile => ({ href: `/adresses/${p.slug}`, title: p.name, sub: p.city, chip: cat(p.category), photo: p.cover, icon: 'pin' }))} />
        <div className="container xp-subhead" data-reveal>
          <h3>{T.byCity}</h3>
        </div>
        <Carousel label={T.citiesLabel} variant="tiles">
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
                  {count(c.count, lang, { fr: ['lieu', 'lieux'], en: ['place', 'places'], ar: ['مكان واحد', 'مكانان', 'أماكن', 'مكانًا'] })} · {c.highlight}
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
            <p className="eyebrow inverse">{dest!.eyebrow}</p>
            <h2>{dest!.title}</h2>
            <p>{dest!.text}</p>
            <Link className="button light" href={`/adresses/${destination.place.slug}`}>
              {dest!.cta}
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
              <p className="eyebrow">{T.demarchesEyebrow}</p>
              <h2>{T.demarchesTitle}</h2>
            </div>
          </div>
        </div>
        <GuideTiles slugs={DEMARCHES} label={T.demarchesLabel} lang={lang} />
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">{T.annoncesEyebrow}</p>
              <h2>{T.annoncesTitle}</h2>
              <p>{T.annoncesText}</p>
            </div>
            <Link className="button primary" href="/annonces/deposer">
              {T.postAd}
            </Link>
          </div>
        </div>
        <TileCarousel
          label={T.annoncesEyebrow}
          tiles={CLASSIFIED_CATEGORIES.map(
            (c): Tile => ({
              href: `/annonces/${c.value}`,
              title: ad(c.label),
              sub: `${c.subs.slice(0, 3).map(([, l]) => ad(l)).join(' · ')} — ${classified.byCategory[c.value] ? count(classified.byCategory[c.value], lang, { fr: ['annonce', 'annonces'], en: ['ad', 'ads'], ar: ['إعلان واحد', 'إعلانان', 'إعلانات', 'إعلانًا'] }) : T.beFirst}`,
              photo: PHOTOS[ANNONCE_PHOTO[c.value] ?? 'alger-ville'].src,
              icon: 'grid',
            }),
          )}
        />
        {!!latest.length && (
          <>
            <div className="container xp-subhead" data-reveal>
              <h3>{T.latestAds}</h3>
              <Link href="/annonces">{T.allAds}</Link>
            </div>
            <Carousel label={T.latestAds} variant="tiles">
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
                    <span className="chip">{c.example ? `${T.exampleChip} · ${ad(c.subLabel)}` : ad(c.subLabel)}</span>
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
              <p className="eyebrow">{T.vivreEyebrow}</p>
              <h2>{T.vivreTitle}</h2>
            </div>
          </div>
        </div>
        <GuideTiles slugs={VIVRE} label={T.vivreLabel} lang={lang} />
      </section>

      <ParallaxBand photo={PHOTOS['ghardaia-marche'].src} credit={PHOTOS['ghardaia-marche'].credit} eyebrow={T.proEyebrow} title={T.proTitle} text={T.proText}>
        <div className="xp-actions">
          <Link className="button primary" href="/professionnels/rejoindre">
            {T.proJoin}
          </Link>
          <Link className="button light" href="/label">
            {T.proLabel}
          </Link>
        </div>
      </ParallaxBand>

      <ParallaxBand photo={PHOTOS['alger-mer'].src} credit={PHOTOS['alger-mer'].credit} eyebrow={T.installEyebrow} title={T.installTitle} text={T.installText}>
        <div className="xp-actions">
          <Link className="button primary" href="/installation">
            {T.installStart}
          </Link>
          <Link className="button light" href="/diagnostic">
            {T.installPlan}
          </Link>
        </div>
      </ParallaxBand>

      <section className="xp-community">
        <div className="container" data-reveal>
          <div>
            <p className="eyebrow inverse">{T.communityEyebrow}</p>
            <h2>{T.communityTitle}</h2>
          </div>
          <NewsletterForm title={null} note={T.communityNote} lang={lang} />
        </div>
      </section>
    </div>
  )
}
