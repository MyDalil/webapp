import { SECTORS, WILAYAS } from './catalog'

// Translittération simple de l’arabe, pour que les noms en arabe aient aussi une adresse de page lisible.
const AR: Record<string, string> = { ا: 'a', أ: 'a', إ: 'i', آ: 'a', ء: '', ؤ: 'o', ئ: 'i', ب: 'b', ت: 't', ة: 'a', ث: 'th', ج: 'dj', ح: 'h', خ: 'kh', د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'ch', ص: 's', ض: 'd', ط: 't', ظ: 'dh', ع: 'a', غ: 'gh', ف: 'f', ق: 'k', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'ou', ى: 'a', ي: 'i', 'ڨ': 'g', 'ڤ': 'v', 'پ': 'p' }
export const latinize = (s: string) => s.replace(/[\u0600-\u06FF]/g, (c) => AR[c] ?? '')

/** Adresse lisible d’un libellé : « Hôpitaux » → « hopitaux », « Tizi Ouzou » → « tizi-ouzou », « ثانوية » → « thanouia ». */
export const slugify = (s: string) =>
  latinize(s)
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
