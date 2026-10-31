'use client'

import Link from 'next/link'
import { Carousel } from '@/platform/ui/Carousel'
import { count, type Lang } from '@/platform/i18n'

type Photo = { src: string; credit: string | null } | null
/** Une porte : photo d’une fiche DALIL publiée, nombre de fiches et un exemple (format « Par ville »). */
export type EntryStat = { photo: Photo; count: number; example: string | null }
export type EntryKey = 'musulmane' | 'services' | 'decouvrir' | 'demarches' | 'annonces' | 'vivre'
export type EntryPhotos = Record<EntryKey, EntryStat>

const fiches = (n: number, l: Lang) => count(n, l, { fr: ['fiche', 'fiches'], en: ['listing', 'listings'], ar: ['عنوان واحد', 'عنوانان', 'عناوين', 'عنوانًا'] })

/** Titres et lignes des portes en anglais et en arabe (mêmes mots que le menu). */
const DOOR_T: Record<'en' | 'ar', Record<EntryKey, [title: string, line?: string]>> = {
  en: { musulmane: ['Muslim life'], services: ['Services', 'Verified doctors, tradespeople and providers'], decouvrir: ['Discover'], demarches: ['Paperwork'], annonces: ['Classifieds', 'Property, jobs, vehicles, items'], vivre: ['Living in Algeria', 'Housing, school, banking, transport'] },
  ar: { musulmane: ['الحياة الإسلامية'], services: ['الخدمات', 'أطباء وحرفيون ومقدّمو خدمات موثَّقون'], decouvrir: ['اكتشف'], demarches: ['الإجراءات'], annonces: ['الإعلانات', 'عقار، عمل، مركبات، أغراض'], vivre: ['العيش في الجزائر', 'السكن، المدرسة، البنك، النقل'] },
}

/**
 * Portes sous le premier écran (ordre validé par Rad, 2026-10-21) : une porte par rubrique du menu,
 * même ordre, mêmes mots.
 */
const DOORS: { key: EntryKey; href: string; title: string; line?: string }[] = [
  { key: 'musulmane', href: '/vie-musulmane', title: 'Vie musulmane' },
  {
    key: 'services',
    href: '/services',
    title: 'Services',
    line: 'Médecins, artisans et prestataires vérifiés',
  },
  { key: 'decouvrir', href: '/explorer', title: 'Découvrir' },
  { key: 'demarches', href: '/demarches', title: 'Démarches' },
  { key: 'annonces', href: '/annonces', title: 'Annonces', line: 'Immobilier, emploi, véhicules, objets' },
  {
    key: 'vivre',
    href: '/installation',
    title: 'Vivre en Algérie',
    line: 'Logement, école, banque, transports',
  },
]

export function HomeEntries({ stats, lang = 'fr' }: { stats: EntryPhotos; lang?: Lang }) {
  return (
    <Carousel label={{ fr: 'Les rubriques de DALIL', en: 'DALIL sections', ar: 'أقسام دليل' }[lang]} variant="tiles">
      {DOORS.map((d, i) => {
        const s = stats[d.key]
        const [title, line] = lang === 'fr' ? [d.title, d.line] : DOOR_T[lang][d.key]
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
                <h3>{title}</h3>
                <p>
                  {line ??
                    [s.count ? fiches(s.count, lang) : null, s.example].filter(Boolean).join(' · ')}
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
