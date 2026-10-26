import { SECTORS, WILAYAS } from './catalog'

/** Adresse lisible d’un libellé : « Hôpitaux » → « hopitaux », « Tizi Ouzou » → « tizi-ouzou ». */
export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const OPEN_WILAYAS = WILAYAS.filter((w) => !w.transition)
export const wilayaSlug = (code: string | number) => {
  const w = WILAYAS.find((x) => String(x.code) === String(code))
  return w ? slugify(w.name) : null
}
export const wilayaBySlug = (slug: string) => OPEN_WILAYAS.find((w) => slugify(w.name) === slug) ?? null
/** Page d’une catégorie de l’annuaire, avec ou sans wilaya (référencement). */
export const categoryPath = (sector: string, category: string, wilaya?: string | number | null) => {
  const w = wilaya ? wilayaSlug(wilaya) : null
  return `/annuaire/${sector}/${slugify(category)}${w ? `/${w}` : ''}`
}
export const categoryBySlug = (sector: string, slug: string) => {
  const s = SECTORS.find((x) => x.slug === sector)
  const category = s?.categories.find((c) => slugify(c) === slug)
  return s && category ? { sector: s, category } : null
}
