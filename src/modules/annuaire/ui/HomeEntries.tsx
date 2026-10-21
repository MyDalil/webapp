'use client'

import Link from 'next/link'
import { Carousel } from '@/platform/ui/Carousel'

type Photo = { src: string; credit: string | null } | null
/** Une porte : photo d’une fiche DALIL publiée, nombre de fiches et un exemple (format « Par ville »). */
export type EntryStat = { photo: Photo; count: number; example: string | null }
export type EntryKey = 'musulmane' | 'services' | 'decouvrir' | 'demarches' | 'vivre'
export type EntryPhotos = Record<EntryKey, EntryStat>

const fiches = (n: number) => `${n} fiche${n > 1 ? 's' : ''}`

/**
 * Portes sous le premier écran (ordre validé par Rad, 2026-10-21) : une porte par rubrique du menu,
 * même ordre, mêmes mots. La porte Annonces s’ajoute quand le module existe (lot 2).
 */
const DOORS: { key: EntryKey; href: string; title: string; line?: string }[] = [
  { key: 'musulmane', href: '/guides/vie-musulmane', title: 'Vie musulmane' },
  {
    key: 'services',
    href: '/services',
    title: 'Services',
    line: 'Médecins, artisans et prestataires vérifiés',
  },
  { key: 'decouvrir', href: '/explorer', title: 'Découvrir' },
  { key: 'demarches', href: '/demarches', title: 'Démarches' },
  {
    key: 'vivre',
    href: '/installation',
    title: 'Vivre en Algérie',
    line: 'Logement, école, banque, transports',
  },
]

export function HomeEntries({ stats }: { stats: EntryPhotos }) {
  return (
    <Carousel label="Les rubriques de DALIL" variant="tiles">
      {DOORS.map((d, i) => {
        const s = stats[d.key]
        return (
          <div
            key={d.key}
            className={`entry-tile entry-${d.key}`}
            data-reveal
            style={{ ['--i' as string]: i % 6 }}
          >
            <Link href={d.href} className="city-tile">
              <div
                className="city-tile-img"
                style={s.photo ? { backgroundImage: `url(${s.photo.src})` } : undefined}
              />
              <div className="city-tile-body">
                <h3>{d.title}</h3>
                <p>
                  {d.line ??
                    [s.count ? fiches(s.count) : null, s.example].filter(Boolean).join(' · ')}
                </p>
              </div>
            </Link>
            {s.photo?.credit && <small className="entry-credit">{s.photo.credit}</small>}
          </div>
        )
      })}
    </Carousel>
  )
}
