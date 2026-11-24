import type { Media, Place } from '@/payload-types'
import { categoryPhoto, cityPhoto } from './listings'

/**
 * Photos d’une adresse (règles pures, sans accès à la base) : photo DALIL ou copiée dans la médiathèque → photo libre
 * en lien direct → illustration de catégorie → photo de la ville. Auteur et licence toujours rendus avec la photo.
 */
export const mediaUrl = (m: number | Media | null | undefined, size: 'thumb' | 'cover') =>
  m && typeof m === 'object' ? (m.sizes?.[size]?.url ?? m.url ?? null) : null

/** Photo sous licence libre (Commons) : vignette plus légère pour les cartes. */
// Wikimedia ne sert que des largeurs standard (960, 1280, 1920…) et jamais plus large que l’original.
const STEPS = [960, 1280, 1920]
export const sized = (url: string, w: number, original?: number | null) => {
  const fit = STEPS.filter((x) => x <= w && (!original || x <= original)).pop() ?? 960
  return url.split('?')[0].replace(/\/(\d+)px-/, `/${fit}px-`)
}
/** Photos d’événements ou de personnes (réunions, visites officielles, période Covid) : jamais en couverture d’un lieu. */
export const PEOPLE_PHOTO = /secretary|meet_and_greet|employees|families|covid|mask|delegation|ceremony|minister|ministre|president|ambassador|meeting|visit_of|_visits_|conference/i

type WithPhotos = Pick<Place, 'photos' | 'externalPhotos'>
export const external = (p: Pick<Place, 'externalPhotos'>) => (p.externalPhotos ?? []).filter((x) => x?.url && !PEOPLE_PHOTO.test(x.url))

/**
 * Photo de la médiathèque venue d’une source libre (copie faite par la tâche `photos-libres`) : elle porte sa licence
 * ou sa page source. Son crédit est dû par la licence, en couverture comme dans la galerie.
 */
const freeCredit = (m: number | Media | null | undefined) =>
  m && typeof m === 'object' && m.credit && (m.license || m.sourceUrl) ? { text: [m.credit, m.license].filter(Boolean).join(' · '), href: m.sourceUrl ?? null } : null

export const coverOf = (p: WithPhotos & Pick<Place, 'category' | 'city'>) =>
  mediaUrl(p.photos?.[0], 'cover') ?? (external(p)[0] ? sized(external(p)[0].url, 1920, external(p)[0].width) : (categoryPhoto(p.category)?.src ?? cityPhoto(p.city)))

/** Crédit de la couverture quand elle vient d’une source libre (obligatoire par la licence). */
export const coverCredit = (p: WithPhotos & Pick<Place, 'category'>): { text: string; href: string | null } | null => {
  if (mediaUrl(p.photos?.[0], 'cover')) {
    const c = freeCredit(p.photos?.[0])
    return c ? { text: `Photo : ${c.text}`, href: c.href } : null
  }
  const x = external(p)[0]
  if (x) return { text: `Photo : ${x.author} · ${x.license}`, href: x.page }
  const c = categoryPhoto(p.category)
  return c ? { text: `Photo d’illustration : ${c.credit}`, href: null } : null
}

export type GalleryItem = { url: string; alt: string; credit: string | null; href: string | null; thumbhash: string | null }

export const galleryOf = (p: WithPhotos & Pick<Place, 'name'>): GalleryItem[] => {
  const media = (p.photos ?? []).flatMap((m) => (m && typeof m === 'object' && m.url ? [m] : []))
  // Une photo libre déjà copiée dans la médiathèque n’est pas montrée une seconde fois en lien direct.
  const copied = new Set(media.map((m) => m.sourceUrl).filter(Boolean))
  return [
    ...media.map((m) => {
      const c = freeCredit(m)
      // Photo libre copiée : taille non recadrée (`large`), comme la source ; envoi de l’équipe : `cover`, comme avant.
      return { url: (m.sourceUrl ? m.sizes?.large?.url : m.sizes?.cover?.url) ?? m.url!, alt: m.alt, credit: c?.text ?? m.credit ?? null, href: c?.href ?? null, thumbhash: m.thumbhash ?? null }
    }),
    ...external(p)
      .filter((x) => !copied.has(x.page))
      .map((x) => ({ url: sized(x.url, 1280, x.width), alt: p.name, credit: `${x.author} · ${x.license}`, href: x.page as string | null, thumbhash: null })),
  ]
}
