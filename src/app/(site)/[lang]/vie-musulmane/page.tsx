import type { Metadata } from 'next'
import { Icon } from '@/platform/ui/Icon'
import Link from '@/platform/ui/Link'
import { searchPlaces } from '@/modules/annuaire'
import { NearMe } from '@/modules/recherche/ui'
import { RUBRICS } from '@/platform/shell/nav'
import { HubHero } from '@/platform/ui/HubHero'
import { PHOTOS } from '@/platform/referentiel/photos'

export const metadata: Metadata = {
  title: 'Vie musulmane en Algérie · DALIL',
  description: 'Mosquées et salles de prière, enseignement coranique, Hajj et Omra, librairies islamiques, entraide, funérailles musulmanes.',
}
export const revalidate = 3600

/**
 * Porte de la rubrique Vie musulmane (même place que /services, /explorer…) : les entrées du menu, validées par Saïd,
 * avec le nombre d’adresses et une photo réelle de chaque catégorie ; « Autour de moi » pour la mosquée la plus proche.
 */
/** Photo libre de repli quand la catégorie n’a pas encore de photo de lieu (même sujet seulement). */
// Photos choisies (Rad, 2026-10-30 : des images, pas des pictogrammes) ; prioritaires sur la photo d’une fiche au hasard.
const FALLBACK: Record<string, string> = { 'Hajj & Omra': PHOTOS.kaaba.src, 'Écoles coraniques': PHOTOS.coran.src, 'Librairies islamiques': PHOTOS['librairie-islamique'].src, 'Associations caritatives et entraide': PHOTOS.iftar.src, 'Pompes funèbres musulmanes et toilette mortuaire': PHOTOS.cimetiere.src }

export default async function VieMusulmane() {
  const rubric = RUBRICS.find((r) => r.key === 'musulmane')
  const entries = rubric?.entries ?? []
  const tiles = await Promise.all(
    entries.map(async ([href, icon, title, sub]) => {
      const category = new URL(href, 'https://www.mydalil.com').searchParams.get('category')
      const r = category ? await searchPlaces({ sector: 'mosquees-priere', category }, 1) : null
      const p = r?.places[0]
      return { href, icon, title, sub, count: r?.total ?? null, photo: FALLBACK[category ?? title] ?? (p && !p.photo.startsWith('/images/lieu') && !p.photo.includes('/images/algeria/') ? p.photo : PHOTOS['djamaa-el-kebir'].src), cover: p?.cover ?? null, credit: p?.credit ?? null, name: p?.name ?? '' }
    }),
  )
  // Photo d’en-tête : seulement une photo libre créditée (licence).
  const pick = tiles.find((t) => t.credit && t.cover)
  const hero = pick ? { photo: pick.cover, credit: pick.credit, name: pick.name } : null
  return (
    <div className="xp">
      <HubHero eyebrow="Vie musulmane" title="Prier, apprendre, s’entraider." lead="Mosquées, enseignement coranique, Hajj et Omra, librairies, entraide et funérailles, partout en Algérie." photo={hero?.photo} credit={hero ? `${hero.name} · ${hero.credit}` : null}>
        <NearMe text="mosquée" label="Mosquées autour de moi" className="near-me-home" />
      </HubHero>

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
                  <span className={`vm-img${t.photo ? '' : ' is-icon'}`} style={t.photo ? { backgroundImage: `url(${t.photo})` } : undefined}>
                    {!t.photo && <Icon name={t.icon} />}
                  </span>
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
