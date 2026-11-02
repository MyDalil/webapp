'use client'

import Link from '@/platform/ui/Link'
import { Carousel } from '@/platform/ui/Carousel'
import { count, type Lang } from '@/platform/i18n'

type Photo = { src: string; credit: string | null } | null
/** Une porte : photo d’une fiche DALIL publiée, nombre de fiches et un exemple (format « Par ville »). */
export type EntryStat = { photo: Photo; count: number; example: string | null }
export type EntryKey = 'sante' | 'services' | 'annonces' | 'musulmane' | 'decouvrir' | 'vivre'
export type EntryPhotos = Record<EntryKey, EntryStat>

const fiches = (n: number, l: Lang) => count(n, l, { fr: ['fiche', 'fiches'], en: ['listing', 'listings'], ar: ['عنوان واحد', 'عنوانان', 'عناوين', 'عنوانًا'] })

/** Titres et lignes des portes en anglais et en arabe (mêmes mots que le menu). */
const DOOR_T: Record<'en' | 'ar', Record<EntryKey, [title: string, line?: string]>> = {
  en: { sante: ['Health', 'Doctors, pharmacies, emergencies'], services: ['Services', 'Repairs, cleaning, home help'], annonces: ['Classifieds', 'Property, jobs, vehicles, items'], musulmane: ['Muslim life'], decouvrir: ['Discover'], vivre: ['Everyday life', 'Moving, papers, housing, school'] },
  ar: { sante: ['الصحة', 'أطباء، صيدليات، طوارئ'], services: ['الخدمات', 'أشغال، تنظيف، مساعدة منزلية'], annonces: ['الإعلانات', 'عقار، عمل، مركبات، أغراض'], musulmane: ['الحياة الإسلامية'], decouvrir: ['اكتشف'], vivre: ['الحياة العملية', 'الاستقرار، الوثائق، السكن، المدرسة'] },
}

/**
 * Portes sous le premier écran : une porte par univers du menu, même ordre, mêmes mots
 * (six univers, validés par Rad le 2026-11-02).
 */
const DOORS: { key: EntryKey; href: string; title: string; line?: string }[] = [
  { key: 'sante', href: '/praticiens', title: 'Santé', line: 'Médecins, pharmacies, urgences' },
  { key: 'services', href: '/services', title: 'Services', line: 'Travaux, ménage, aide à domicile' },
  { key: 'annonces', href: '/annonces', title: 'Annonces', line: 'Immobilier, emploi, véhicules, objets' },
  { key: 'musulmane', href: '/vie-musulmane', title: 'Vie musulmane' },
  { key: 'decouvrir', href: '/explorer', title: 'Découvrir' },
  { key: 'vivre', href: '/demarches', title: 'Vie pratique', line: 'Installation, papiers, logement, école' },
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
