import type { Metadata } from 'next'
import Link from 'next/link'
import { searchPlaces } from '@/modules/annuaire'
import { NearMe } from '@/modules/recherche/ui'
import { RUBRICS } from '@/platform/shell/nav'

export const metadata: Metadata = {
  title: 'Vie musulmane en Algérie · DALIL',
  description: 'Mosquées et salles de prière, enseignement coranique, Hajj et Omra, librairies islamiques, entraide, funérailles musulmanes.',
}
export const revalidate = 3600

/**
 * Porte de la rubrique Vie musulmane (même place que /services, /explorer…) : les entrées du menu, validées par Saïd,
 * avec le nombre d’adresses et une photo réelle de chaque catégorie ; « Autour de moi » pour la mosquée la plus proche.
 */
export default async function VieMusulmane() {
  const rubric = RUBRICS.find((r) => r.key === 'musulmane')
  const entries = rubric?.entries ?? []
  const tiles = await Promise.all(
    entries.map(async ([href, , title, sub]) => {
      const category = new URL(href, 'https://www.mydalil.com').searchParams.get('category')
      const r = category ? await searchPlaces({ sector: 'mosquees-priere', category }, 1) : null
      const p = r?.places[0]
      return { href, title, sub, count: r?.total ?? null, photo: p && !p.photo.startsWith('/images/lieu') ? p.photo : null }
    }),
  )
  const hero = tiles.find((t) => t.photo)?.photo
  return (
    <div className="xp">
      <section className="xp-hero xp-hero-city">
        {hero && <div className="xp-hero-img" style={{ backgroundImage: `url(${hero})` }} />}
        <div className="xp-hero-shade" />
        <div className="xp-hero-content container">
          <p className="eyebrow inverse">Vie musulmane</p>
          <h1>Prier, apprendre, s’entraider.</h1>
          <p className="xp-lead">Mosquées et salles de prière, enseignement coranique, Hajj et Omra, librairies, entraide et funérailles, partout en Algérie.</p>
          <div className="vm-actions">
            <NearMe text="mosquée" label="Mosquées autour de moi" className="near-me-home" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Que cherchez-vous ?</h2>
            </div>
            {rubric?.feature && (
              <Link className="button outline" href={rubric.feature.href}>
                {rubric.feature.title}
              </Link>
            )}
          </div>
          <ul className="vm-grid">
            {tiles.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="vm-tile">
                  <span className="vm-img" style={t.photo ? { backgroundImage: `url(${t.photo})` } : undefined} />
                  <span className="vm-body">
                    <b>{t.title}</b>
                    <small>
                      {t.sub}
                      {t.count ? ` · ${t.count.toLocaleString('fr-FR')} adresse${t.count > 1 ? 's' : ''}` : ''}
                    </small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
