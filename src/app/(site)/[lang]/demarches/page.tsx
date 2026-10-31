import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { searchPlaces } from '@/modules/annuaire'
import { DEMARCHES, DEMARCHE_CATEGORIES, GUIDE_VISUALS, OFFICIAL_SITES, OFFICIAL_SITES_CHECKED } from '@/modules/contenus'
import { offerState, packsByGuide } from '@/modules/accompagnement'
import { SoonButton, Transparency, Why } from '@/modules/accompagnement/ui'
import { NearMe } from '@/modules/recherche/ui'
import { GUIDES } from '@/platform/referentiel/catalog'
import { PHOTOS, type PhotoKey } from '@/platform/referentiel/photos'
import { RUBRICS } from '@/platform/shell/nav'
import { Icon } from '@/platform/ui/Icon'
import { ParallaxBand, SectionHead, TileCarousel, XpHero, type Tile } from '@/platform/ui/Xp'

export const metadata: Metadata = {
  title: 'Démarches en Algérie · DALIL',
  description: 'Passeport, changement de résidence, auto-entrepreneur, administrations, ambassades : les étapes, les pièces et les sites officiels, sources datées.',
}
export const revalidate = 3600

/** Photo de chaque entrée « essentielle » : seulement une photo qui montre le sujet. */
const ESSENTIAL_PHOTO: Record<string, PhotoKey | undefined> = {
  'Documents & papiers': 'grande-poste-jour',
  Administrations: 'grande-poste',
  'Créer son entreprise': 'epices',
  'S’installer depuis l’étranger': 'alger-mer',
  'Ambassades & consulats': 'ambassade',
  'Urgences & contacts utiles': 'protection-civile',
}
const ICON: Record<string, string> = { file: 'file', building: 'building', briefcase: 'briefcase', plane: 'home', flag: 'building', phone: 'health' }
const GUIDE_ORDER = ['documents-et-demarches', 'preparer-son-installation', 'travail-et-entreprise', 'budget-et-banque', 'logement', 'ecole-et-famille', 'sante', 'transport', 'internet-et-telecoms', 'choisir-sa-ville']
const HELP = [
  { title: 'Quoi faire, dans quel ordre', text: 'Chaque guide découpe la démarche en étapes simples, avec ses sources officielles.' },
  { title: 'Les pièces à préparer', text: 'La liste des documents à réunir avant de vous déplacer ou de remplir un formulaire.' },
  { title: 'Où aller', text: 'Le site officiel pour le faire en ligne, ou l’administration la plus proche de chez vous.' },
]
const photo = (k?: PhotoKey) => (k ? PHOTOS[k] : null)

/** Rubrique Démarches au format de l’accueil : diaporama, grandes tuiles photo en carrousel, bande parallaxe. */
export default async function Demarches() {
  const rubric = RUBRICS.find((r) => r.key === 'demarches')
  const entries = await Promise.all(
    (rubric?.entries ?? []).map(async ([href, icon, title, sub]) => {
      const u = new URL(href, 'https://www.mydalil.com')
      const category = u.searchParams.get('category')
      const sector = u.pathname.split('/')[2]
      const r = category && sector ? await searchPlaces({ sector, category }, 1) : null
      return { href, icon: ICON[icon] ?? 'file', title, sub, count: r?.total ?? null }
    }),
  )
  const packs = await packsByGuide()
  const open = (await offerState()).mode === 'ouvert'

  const slides = (['grande-poste', 'passeport', 'ferry', 'alger-mer'] as PhotoKey[]).map((k) => ({ src: PHOTOS[k].src, title: PHOTOS[k].alt, place: 'Démarches', href: '/demarches', credit: PHOTOS[k].credit }))
  const phares: Tile[] = DEMARCHES.map((d) => {
    const pack = packs.get(`/demarches/${d.slug}`)
    return {
      href: `/demarches/${d.slug}`,
      title: d.short,
      sub: d.where,
      chip: 'Guide gratuit',
      photo: d.image,
      icon: d.icon,
      footer: (
        <>
          <Link href={`/demarches/${d.slug}#guide`} className="sr-pill">
            Guide gratuit
          </Link>
          {pack &&
            (open ? (
              <Link href={`/accompagnement/${pack}`} className="sr-pill is-primary" aria-label={`Pack Accompagnement Premium : ${d.short}`}>
                Se faire accompagner
              </Link>
            ) : (
              <SoonButton label="Pack" />
            ))}
        </>
      ),
    }
  })
  const essentials: Tile[] = entries.map((e) => ({ href: e.href, title: e.title, sub: e.count ? `${e.sub} · ${e.count.toLocaleString('fr-FR')} adresses` : e.sub, photo: photo(ESSENTIAL_PHOTO[e.title])?.src, icon: e.icon }))
  const guides: Tile[] = GUIDE_ORDER.map((s) => GUIDES.find((g) => g.slug === s))
    .filter((g): g is (typeof GUIDES)[number] => Boolean(g))
    .map((g) => ({ href: `/guides/${g.slug}`, title: g.title, sub: g.summary, chip: g.category, photo: photo(GUIDE_VISUALS[g.slug]?.photo)?.src, icon: GUIDE_VISUALS[g.slug]?.icon ?? 'file' }))
  const band = PHOTOS.casbah

  return (
    <div className="xp">
      <XpHero slides={slides} eyebrow="Démarches" title={<>Vos démarches, <em className="hub-accent">sans stress</em>.</>} lead="Quoi faire, quelles pièces préparer, où aller : étape par étape, avec les sources officielles.">
        <form action="/recherche" className="dm-search" role="search">
          <Icon name="search" />
          <input name="q" type="search" placeholder="Passeport, CCR, registre de commerce…" aria-label="Rechercher une démarche" />
        </form>
        <NearMe text="administration" label="Administrations autour de moi" className="near-me-home" />
      </XpHero>

      <section className="section">
        <SectionHead eyebrow="Par thème" title="Que voulez-vous faire ?" />
        <nav className="xp-chips" aria-label="Thèmes">
          {DEMARCHE_CATEGORIES.map((c) => (
            <Link key={c.key} href={c.href} className="xp-chip">
              <span className={`dm-cat-icon is-${c.color}`}>
                <Icon name={c.icon} />
              </span>
              <span>
                {c.label}
                <small>{c.sub}</small>
              </span>
            </Link>
          ))}
        </nav>
      </section>

      <section className="section section-tint">
        <SectionHead eyebrow="Démarches phares" title="Les plus demandées, pas à pas." />
        <TileCarousel label="Démarches phares" tiles={phares} />
        {packs.size > 0 && (
          <div className="container xp-narrow">
            <Transparency />
          </div>
        )}
      </section>

      <ParallaxBand photo={band.src} credit={band.credit} eyebrow="Comment DALIL vous aide" title="Moins d’allers-retours, plus de clarté.">
        <ol className="xp-steps">
          {HELP.map((h, i) => (
            <li key={h.title}>
              <span className="xp-step-n">{i + 1}</span>
              <b>{h.title}</b>
              <small>{h.text}</small>
            </li>
          ))}
        </ol>
      </ParallaxBand>

      <section className="section">
        <SectionHead eyebrow="Les essentiels" title="Les bons interlocuteurs." />
        <TileCarousel label="Les essentiels" tiles={essentials} />
      </section>

      <section className="section section-tint" id="guides">
        <SectionHead
          eyebrow="Guides pratiques"
          title="Tout préparer, sujet par sujet."
          action={
            <Link className="button outline" href="/guides">
              Tous les guides
            </Link>
          }
        />
        <TileCarousel label="Guides pratiques" tiles={guides} />
      </section>

      <section className="section container xp-narrow">
        <div className="sr-group">
          <h2>
            Sites officiels <small>· relevés le {new Date(OFFICIAL_SITES_CHECKED).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</small>
          </h2>
          <ul className="sr-list">
            {OFFICIAL_SITES.map((s) => (
              <li key={s.need}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="sr-row is-wrap" title={`Source de l’adresse : ${s.source}`}>
                  <span className="sr-icon" aria-hidden="true">
                    <Icon name="check" />
                  </span>
                  <span className="sr-text">
                    <b>{s.need}</b>
                    <small>
                      {s.what} <span className="sr-site">{s.site} ↗</span>
                    </small>
                  </span>
                  <span />
                  <span className="sr-chev" aria-hidden="true">›</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="sr-note">Les démarches se font gratuitement sur les sites de l’État. Seul dzds.dz est le portail officiel (pas les variantes en .com ou .online). DALIL ne vous demande jamais vos identifiants ni vos codes.</p>
        </div>
        {packs.size > 0 && <Why />}
        <p className="sr-note">
          Une démarche manque, ou une information a changé ? <Link href="/feedback">Dites-le-nous</Link>.
        </p>
      </section>
    </div>
  )
}
