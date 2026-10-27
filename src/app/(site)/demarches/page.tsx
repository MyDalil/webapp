import type { Metadata } from 'next'
import Link from 'next/link'
import { searchPlaces } from '@/modules/annuaire'
import { GUIDES } from '@/platform/referentiel/catalog'
import { RUBRICS } from '@/platform/shell/nav'
import { Icon } from '@/platform/ui/Icon'

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
  const guides = GUIDE_ORDER.map((s) => GUIDES.find((g) => g.slug === s)).filter((g): g is (typeof GUIDES)[number] => Boolean(g))
  return (
    <section className="sr" aria-labelledby="demarches-titre">
      <header className="sr-head">
        <p className="sr-eyebrow">Démarches</p>
        <h1 id="demarches-titre">Vos démarches, étape par étape.</h1>
        <p className="sr-meta">Papiers, administrations, entreprise, installation : les bons interlocuteurs et les pièces à préparer. Chaque guide cite ses sources et leur date de consultation.</p>
      </header>

      <section className="sr-group" aria-label="Les essentiels">
        <h2>Les essentiels</h2>
        <ul className="sr-list">
          {entries.map((e) => (
            <li key={e.href}>
              <Link href={e.href} className="sr-row">
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
  )
}
