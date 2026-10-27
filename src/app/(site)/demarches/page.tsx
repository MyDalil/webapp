import type { Metadata } from 'next'
import Link from 'next/link'
import { searchPlaces } from '@/modules/annuaire'
import { OFFICIAL_SITES, OFFICIAL_SITES_CHECKED } from '@/modules/contenus'
import { GUIDES } from '@/platform/referentiel/catalog'
import { RUBRICS } from '@/platform/shell/nav'
import { Icon } from '@/platform/ui/Icon'
import { HubHero } from '@/platform/ui/HubHero'
import { NearMe } from '@/modules/recherche/ui'
import { offerState, packsByGuide } from '@/modules/accompagnement'
import { SoonButton, Transparency, Why } from '@/modules/accompagnement/ui'
import { DEMARCHES, DEMARCHE_CATEGORIES } from '@/modules/contenus'

export const metadata: Metadata = {
  title: 'Démarches en Algérie · DALIL',
  description: 'Documents et papiers, administrations, création d’entreprise, installation, ambassades et contacts utiles : les bons interlocuteurs et les pièces à préparer.',
}
export const revalidate = 3600

/** Guides utiles aux démarches (référentiel), dans l’ordre d’un parcours d’installation. */
const GUIDE_ORDER = ['documents-et-demarches', 'preparer-son-installation', 'travail-et-entreprise', 'budget-et-banque', 'logement', 'ecole-et-famille', 'sante', 'transport', 'internet-et-telecoms', 'choisir-sa-ville']
const ICON: Record<string, string> = { file: 'file', building: 'building', briefcase: 'briefcase', plane: 'home', flag: 'building', phone: 'health' }
const GUIDE_ICON: Record<string, string> = { 'documents-et-demarches': 'file', 'preparer-son-installation': 'home', 'travail-et-entreprise': 'briefcase', 'budget-et-banque': 'grid', logement: 'home', 'ecole-et-famille': 'school', sante: 'health', transport: 'car', 'internet-et-telecoms': 'list', 'choisir-sa-ville': 'pin' }

/**
 * Porte de la rubrique Démarches (même modèle que /vie-musulmane) : entrées du menu avec le nombre d’adresses officielles,
 * puis les guides pratiques (étapes, sources datées). Remplace la page « parcours de démonstration » du prototype.
 */
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
  // Photo d’en-tête : baie d’Alger (photo du site, créditée — voir /credits-photos).
  const hero = { cover: '/images/algeria/alger.webp', credit: 'Photo : Manini row · CC BY-SA 4.0', name: 'Baie d’Alger' }
  // Guides du référentiel (les démarches phares ont leur fiche sourcée, plus haut).
  const guides = [
    ...GUIDE_ORDER.map((s) => GUIDES.find((g) => g.slug === s))
      .filter((g): g is (typeof GUIDES)[number] => Boolean(g))
      .map((g) => ({ href: `/guides/${g.slug}`, icon: GUIDE_ICON[g.slug] ?? 'file', title: g.title, summary: g.summary })),
  ]
  // Packs d’accompagnement (vide tant que l’offre est cachée).
  const packs = await packsByGuide()
  const open = (await offerState()).mode === 'ouvert'
  // Couleurs des pictogrammes : une teinte par ligne, pour repérer les rubriques d’un coup d’œil.
  const TONES = ['ciel', 'sable', 'vert', 'violet', 'corail']
  return (
    <>
    <HubHero eyebrow="Démarches" title={<>Vos démarches en Algérie, <em className="hub-accent">sans stress</em>.</>} lead="DALIL vous guide : quoi faire, quelles pièces préparer, où aller." photo={hero.cover} credit={`${hero.name} · ${hero.credit}`}>
      <form action="/recherche" className="dm-search" role="search">
        <Icon name="search" />
        <input name="q" type="search" placeholder="Rechercher une démarche…" aria-label="Rechercher une démarche" />
      </form>
      <NearMe text="administration" label="Administrations autour de moi" className="near-me-home" />
    </HubHero>
    <section className="sr" aria-label="Démarches">
      <section className="sr-group" aria-label="Catégories populaires">
        <h2 className="dm-head">
          Catégories populaires <Link href="#guides">Tout voir</Link>
        </h2>
        <ul className="dm-cats">
          {DEMARCHE_CATEGORIES.map((c) => (
            <li key={c.key}>
              <Link href={c.href}>
                <span className={`dm-cat-icon is-${c.color}`}>
                  <Icon name={c.icon} />
                </span>
                <b>{c.label}</b>
                <small>{c.sub}</small>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="sr-group" aria-label="Démarches phares">
        <h2>Démarches phares</h2>
        <ul className="dm-cards swipe">
          {DEMARCHES.map((d) => {
            const pack = packs.get(`/demarches/${d.slug}`)
            return (
              <li key={d.slug} className="dm-card">
                <Link href={`/demarches/${d.slug}`} className="dm-card-main">
                  <span className="dm-card-media">
                    {/* eslint-disable-next-line @next/next/no-img-element -- illustration SVG locale */}
                    <img className="dm-card-img" src={d.image} alt="" width={640} height={360} loading="lazy" />
                    <span className="dm-card-overlay">
                      <b>{d.short}</b>
                      <small>
                        <Icon name="pin" /> {d.where}
                      </small>
                    </span>
                    <span className="dm-card-badge">Guide gratuit</span>
                  </span>
                  <span className="dm-card-text">
                    <small>{d.summary}</small>
                  </span>
                </Link>
                <span className="dm-card-actions">
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
                </span>
              </li>
            )
          })}
        </ul>
        {packs.size > 0 && <Transparency />}
      </section>

      <section className="sr-group" aria-label="Comment DALIL vous aide">
        <h2>Comment DALIL vous aide</h2>
        <ul className="sr-steps swipe">
          <li>
            <b>Quoi faire, dans quel ordre</b>
            <small>Chaque guide découpe la démarche en étapes simples, avec ses sources officielles.</small>
          </li>
          <li>
            <b>Les pièces à préparer</b>
            <small>La liste des documents à réunir avant de vous déplacer ou de remplir un formulaire.</small>
          </li>
          <li>
            <b>Où aller</b>
            <small>Le site officiel pour le faire en ligne, ou l’administration la plus proche de chez vous.</small>
          </li>
        </ul>
        <p className="sr-note">Les démarches se font gratuitement sur les sites de l’État. DALIL ne vous demande jamais vos identifiants ni vos codes.</p>
      </section>

      <section className="sr-group" aria-label="Les essentiels">
        <h2>Les essentiels</h2>
        <ul className="sr-list">
          {entries.map((e, i) => (
            <li key={e.href}>
              <Link href={e.href} className="sr-row is-wrap">
                <span className={`sr-icon is-${TONES[i % TONES.length]}`} aria-hidden="true">
                  <Icon name={e.icon} />
                </span>
                <span className="sr-text">
                  <b>{e.title}</b>
                  <small>
                    {e.sub}
                    {e.count ? ` · ${e.count.toLocaleString('fr-FR')} adresses` : ''}
                  </small>
                </span>
                <span />
                <span className="sr-chev" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="sr-group" aria-label="Sites officiels">
        <h2>
          Sites officiels <small>· adresses relevées le {new Date(OFFICIAL_SITES_CHECKED).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</small>
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
        <p className="sr-note">Attention aux copies : seul dzds.dz est le portail officiel (pas les variantes en .com ou .online). Aucune administration ne demande de payer un intermédiaire.</p>
      </section>

      <section className="sr-group" id="guides" aria-label="Guides pratiques">
        <h2>Guides pratiques</h2>
        <ul className="sr-list">
          {guides.map((g, i) => (
            <li key={g.href}>
              <Link href={g.href} className="sr-row is-wrap">
                <span className={`sr-icon is-${TONES[(i + 2) % TONES.length]}`} aria-hidden="true">
                  <Icon name={g.icon} />
                </span>
                <span className="sr-text">
                  <b>{g.title}</b>
                  <small>{g.summary}</small>
                </span>
                <span className="ac-free">Guide gratuit</span>
                <span className="sr-chev" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {packs.size > 0 && <Why />}

      <p className="sr-note">
        Une démarche manque, ou une information a changé ? <Link href="/feedback">Dites-le-nous</Link>.
      </p>
    </section>
    </>
  )
}
