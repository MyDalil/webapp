'use client'

import Link from 'next/link'
import { Carousel } from '@/platform/ui/Carousel'
import { useWilaya } from '@/platform/shell/wilaya'

type Photo = { src: string; credit: string | null } | null
/** Une entrée : photo d’une fiche DALIL publiée, nombre de lieux et un exemple (format « Par ville »). */
export type EntryStat = { photo: Photo; count: number; example: string | null }
export type EntryPhotos = Record<'weekend' | 'decouvrir' | 'nature' | 'adresses' | 'quotidien' | 'coeur', EntryStat>
type City = { name: string; slug: string; cover: string; credit: string | null; count: number; highlight: string }

const lieux = (n: number) => `${n} lieu${n > 1 ? 'x' : ''}`

/**
 * Huit entrées sous le premier écran (validées par Rad, 2026-10-17), au format des tuiles « Par ville » :
 * texte sur la photo, nombre de lieux et un exemple. « Près de chez vous » et « Vivre dans ma ville »
 * suivent la wilaya choisie dans l’en-tête.
 */
export function HomeEntries({ stats, cities, total }: { stats: EntryPhotos; cities: City[]; total: number }) {
  const w = useWilaya()
  const city = (w && cities.find((c) => c.name === w.name)) || null
  const shown = city ?? cities[0] ?? null
  const local: EntryStat = city
    ? { photo: { src: city.cover, credit: city.credit }, count: city.count, example: city.highlight }
    : { photo: shown ? { src: shown.cover, credit: shown.credit } : null, count: total, example: null }
  const pickWilaya = () => window.dispatchEvent(new Event('dalil:pick-wilaya'))

  const cards: { key: string; href: string; title: string; stat: EntryStat; line?: string; action?: string }[] = [
    { key: 'weekend', href: '/que-faire-ce-week-end', title: 'Que faire ce week‑end ?', stat: stats.weekend },
    { key: 'decouvrir', href: '/annuaire/culture-nature-loisirs', title: 'À découvrir', stat: stats.decouvrir },
    { key: 'pres', href: w ? `/annuaire?wilaya=${w.code}` : '/annuaire', title: 'Près de chez vous', stat: local, line: w ? undefined : 'Choisissez votre wilaya', action: w ? undefined : 'Choisir ma wilaya' },
    { key: 'nature', href: '/annuaire/culture-nature-loisirs?theme=nature', title: 'Nature & Bien-être', stat: stats.nature },
    {
      key: 'ville',
      href: city ? `/villes/${city.slug}` : shown ? `/villes/${shown.slug}` : '/installation',
      title: 'Vivre dans ma ville',
      stat: city ? local : shown ? { photo: { src: shown.cover, credit: shown.credit }, count: shown.count, example: shown.highlight } : local,
      line: city ? undefined : shown ? `${shown.name} · ${lieux(shown.count)}` : undefined,
    },
    { key: 'adresses', href: '/annuaire', title: 'Les bonnes adresses', stat: stats.adresses },
    { key: 'quotidien', href: '/services', title: 'Facilitez votre quotidien', stat: stats.quotidien, line: 'Prestataires vérifiés, demande sous 24 h' },
    { key: 'coeur', href: '/annuaire?coeur=1', title: 'Nos coups de cœur', stat: stats.coeur, line: stats.coeur.count ? undefined : 'Sélection de l’équipe en préparation' },
  ]

  return (
    <Carousel label="Que souhaitez-vous faire aujourd’hui ?" variant="tiles">
      {cards.map((c, i) => (
        <div key={c.key} className={`entry-tile entry-${c.key}`} data-reveal style={{ ['--i' as string]: i % 6 }}>
          <Link
            href={c.href}
            className="city-tile"
            // Sans wilaya choisie, « Près de chez vous » ouvre le choix de la wilaya (pas de bouton en plus sur la photo).
            onClick={c.action ? (e) => (e.preventDefault(), pickWilaya()) : undefined}
          >
            <div className="city-tile-img" style={c.stat.photo ? { backgroundImage: `url(${c.stat.photo.src})` } : undefined} />
            <div className="city-tile-body">
              <h3>{c.title}</h3>
              <p>{c.line ?? [lieux(c.stat.count), c.stat.example].filter(Boolean).join(' · ')}</p>
            </div>
          </Link>
          {c.stat.photo?.credit && <small className="entry-credit">{c.stat.photo.credit}</small>}
        </div>
      ))}
    </Carousel>
  )
}
