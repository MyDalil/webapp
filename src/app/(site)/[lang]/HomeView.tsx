import { GUIDE_VISUALS } from '@/modules/contenus'
import Link from '@/platform/ui/Link'
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
import { PHOTOS, smallPhoto, type PhotoKey } from '@/platform/referentiel/photos'
import { Slideshow } from '@/platform/ui/Slideshow'
import { Icon, iconFor, iconTone } from '@/platform/ui/Icon'
import { GUIDES } from '@/platform/referentiel/catalog'
import { RUBRICS } from '@/platform/shell/nav'
import { categoryLabel, count, type Lang } from '@/platform/i18n'
import { HOME_T, CLASSIFIED_T, GUIDE_T, DESTINATION_DEFAULT, MUSULMANE_T } from './homeText'

/** Pictogramme d’une annonce : celui de sa sous-catégorie (même couleur partout sur le site). */
const adIcon = (c: { category: string; subLabel: string }) => iconFor(c.subLabel, ({ immobilier: 'home', emploi: 'briefcase', vehicules: 'car' } as Record<string, string>)[c.category] ?? 'tag')

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

  // Diaporama mixte : une mosquée, un lieu de santé, un monument, un site naturel, puis les incontournables.
  // Pas de bureau officiel (Rad, 2026-11-15) : leurs photos libres montrent des cérémonies, pas le lieu.
  const mixed = [
    pick(inSector('mosquees-priere'), (p) => p.category === 'Mosquées'),
    pick(
      inSector('culture-nature-loisirs'),
      (p) => p.category === 'Monuments et sites historiques',
    ),
    pick(inSector('culture-nature-loisirs'), (p) => p.category !== 'Monuments et sites historiques'),
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
  const photos: EntryPhotos = {
    sante: { ...door(['sante-soins']), photo: { src: PHOTOS['hopital-moderne'].src, credit: PHOTOS['hopital-moderne'].credit }, example: null },
    // Portes Services et Vie pratique : photo choisie qui montre le sujet (pas une fiche au hasard).
    services: { ...door(['maison-travaux', 'droit-finance-conseil', 'transports-mobilite']), photo: { src: PHOTOS['domicile-travaux'].src, credit: PHOTOS['domicile-travaux'].credit }, example: null },
    annonces: (() => {
      const c = latest.find((x) => x.photo)
      return { photo: c?.photo ? { src: c.photo, credit: null } : { src: PHOTOS['alger-ville'].src, credit: PHOTOS['alger-ville'].credit }, count: classified.total, example: null }
    })(),
    musulmane: door(['mosquees-priere'], (p) => p.category === 'Mosquées'),
    decouvrir: door(['culture-nature-loisirs', 'restaurants-gastronomie']),
    vivre: { ...door(['administrations-services-publics']), photo: { src: PHOTOS['grande-poste'].src, credit: PHOTOS['grande-poste'].credit }, example: null },
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
      {/* Accueil court (Rad, 2026-11-15) : recherche, rubriques, annonces, découvrir, destination (Sahara), professionnels, newsletter. Le reste vit dans les pages de rubrique. */}
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
              <p className="section-lead">{T.rubricsLead}</p>
            </div>
          </div>
        </div>
        <HomeEntries stats={photos} lang={lang} />
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
              {/* Exemples seuls : jamais présentés comme de vraies « dernières annonces » (audit D07). */}
              <h3>{latest.every((c) => c.example) ? T.examplesAds : T.latestAds}</h3>
              <Link href="/annonces">{T.allAds}</Link>
            </div>
            <Carousel label={latest.every((c) => c.example) ? T.examplesAds : T.latestAds} variant="tiles">
              {latest.map((c, i) => (
                <Link key={c.id} href={c.href} className="city-tile top-tile" data-reveal style={{ ['--i' as string]: i % 6, ['--ic' as string]: iconTone(adIcon(c)) }}>
                  {c.photo ? (
                    <div className="city-tile-img" style={{ backgroundImage: `url(${smallPhoto(c.photo)})` }} />
                  ) : (
                    <div className="city-tile-img is-icon is-annonce">
                      <span className="xp-tile-icon" aria-hidden="true">
                        <Icon name={adIcon(c)} />
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

      <section className="section xp-band">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">{T.decouvrirEyebrow}</p>
              <h2>{T.decouvrirTitle}</h2>
              <p className="section-lead">{T.decouvrirLead}</p>
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
