import type { Metadata } from 'next'
import Link from 'next/link'
import { searchPlaces } from '@/modules/annuaire'
import { OFFICIAL_SITES, OFFICIAL_SITES_CHECKED } from '@/modules/contenus'
import { GUIDES } from '@/platform/referentiel/catalog'
import { RUBRICS } from '@/platform/shell/nav'
import { Icon } from '@/platform/ui/Icon'
import { HubHero } from '@/platform/ui/HubHero'
import { NearMe } from '@/modules/recherche/ui'

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
  const guides = GUIDE_ORDER.map((s) => GUIDES.find((g) => g.slug === s)).filter((g): g is (typeof GUIDES)[number] => Boolean(g))
  return (
    <>
    <HubHero eyebrow="Démarches" title="Vos démarches, étape par étape." lead="DALIL vous guide : quoi faire, quelles pièces préparer, où aller." photo={hero.cover} credit={`${hero.name} · ${hero.credit}`}>
      <NearMe text="administration" label="Administrations autour de moi" className="near-me-home" />
    </HubHero>
    <section className="sr" aria-label="Démarches">
      <section className="sr-group" aria-label="Comment DALIL vous aide">
        <h2>Comment DALIL vous aide</h2>
        <ul className="sr-steps">
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
        <p className="sr-note">Les démarches en ligne se font sur les sites de l’État, sans intermédiaire : DALIL ne vous demande jamais de payer une démarche ni vos identifiants.</p>
      </section>

      <section className="sr-group" aria-label="Les essentiels">
        <h2>Les essentiels</h2>
        <ul className="sr-list">
          {entries.map((e) => (
            <li key={e.href}>
              <Link href={e.href} className="sr-row is-wrap">
                <span className="sr-icon" aria-hidden="true">
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

      <section className="sr-group" aria-label="Guides pratiques">
        <h2>Guides pratiques</h2>
        <ul className="sr-list">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="sr-row is-wrap">
                <span className="sr-icon is-guide" aria-hidden="true">
                  <Icon name={GUIDE_ICON[g.slug] ?? 'file'} />
                </span>
                <span className="sr-text">
                  <b>{g.title}</b>
                  <small>{g.summary}</small>
                </span>
                <span />
                <span className="sr-chev" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="sr-note">
        Une démarche manque, ou une information a changé ? <Link href="/feedback">Dites-le-nous</Link>.
      </p>
    </section>
    </>
  )
}
