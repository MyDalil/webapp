import { SECTORS, WILAYA_ALIASES, WILAYAS } from '@/platform/referentiel/catalog'
import { looseWordMatch, placeWords, WILAYA_VARIANTS } from '@/platform/referentiel/placeNames'

/**
 * Validation des réponses des visiteurs du bot (Telegram, WhatsApp) — pur, testé, sans réseau ni base.
 * Wilaya : référentiel des 69 wilayas + variantes réelles (placeNames.ts, alias des nouvelles wilayas).
 */
export type Wilaya = { code: number; name: string }

/** Les 6 wilayas proposées en boutons (les plus peuplées et les plus demandées) ; les autres : « Autre » puis saisie. */
export const TOP_WILAYAS = [16, 31, 19, 25, 15, 9] as const

const key = (s: string) => placeWords(s).join(' ')
const NAMES: { code: number; forms: string[] }[] = WILAYAS.map((w) => ({
  code: w.code,
  forms: [w.name, ...(WILAYA_VARIANTS[w.code] ?? []), ...(WILAYA_ALIASES[w.name] ?? [])].map(key).filter(Boolean),
}))

export const wilayaByCode = (code: number | string): Wilaya | null => WILAYAS.find((w) => w.code === Number(code)) ?? null

/** Nom de wilaya affiché : arabe si connu et demandé, sinon nom français du référentiel. */
export const wilayaName = (w: Wilaya, lang: 'fr' | 'en' | 'ar') => (lang === 'ar' ? (WILAYA_VARIANTS[w.code]?.[0] ?? w.name) : w.name)

/** « Oran », « 31 », « wahran », « وهران », « wilaya de Setif », « Constantin » (faute simple) → wilaya ; sinon null. */
export function findWilaya(raw: string): Wilaya | null {
  const s = raw.trim().replace(/^(la\s+)?wilaya\s+(de\s+|d[’']\s*)?/i, '').replace(/^ولاية\s+/, '').trim()
  if (!s || s.length > 60) return null
  if (/^\d{1,2}$/.test(s)) return wilayaByCode(Number(s))
  const k = key(s)
  if (!k) return null
  const exact = NAMES.find((n) => n.forms.includes(k))
  if (exact) return wilayaByCode(exact.code)
  // Une faute simple tolérée, mot à mot (mots de 5 lettres au moins).
  const words = k.split(' ')
  const loose = NAMES.filter((n) => n.forms.some((f) => { const fw = f.split(' '); return fw.length === words.length && fw.every((w, i) => looseWordMatch(words[i], w)) }))
  return loose.length === 1 ? wilayaByCode(loose[0].code) : null
}

/** Rubriques de l’annuaire (référentiel) proposées en boutons. */
export const RUBRIQUES = SECTORS.map((s) => ({ slug: s.slug, title: s.title }))

/** Activité saisie librement : catégorie exacte du référentiel si elle existe (sans accent ni casse). */
export function matchCategory(raw: string): { sector: string; category: string } | null {
  const k = key(raw)
  if (!k) return null
  for (const s of SECTORS) {
    const c = s.categories.find((x) => key(x) === k || key(x).replace(/s\b/g, '') === k.replace(/s\b/g, ''))
    if (c) return { sector: s.slug, category: c }
  }
  return null
}

const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length
const URLISH = /(https?:\/\/|www\.|\.(com|net|org|dz|fr)\b)/i

/** Nom d’établissement : 2 à 120 caractères, au moins 2 lettres, ni lien ni commande. */
export function validName(raw: string): string | null {
  const s = raw.replace(/\s+/g, ' ').trim()
  if (s.length < 2 || s.length > 120 || letters(s) < 2 || s.startsWith('/') || URLISH.test(s)) return null
  return s
}

/** Activité saisie : 3 à 80 caractères, au moins 3 lettres, ni lien ni commande. */
export function validActivity(raw: string): string | null {
  const s = raw.replace(/\s+/g, ' ').trim()
  if (s.length < 3 || s.length > 80 || letters(s) < 3 || s.startsWith('/') || URLISH.test(s)) return null
  return s
}

/**
 * Numéro algérien (mobile 05/06/07 + 8 chiffres, fixe 02/03/04 + 7 chiffres, avec ou sans +213 / 00213)
 * ou international valide (+ ou 00, indicatif sans zéro, 8 à 15 chiffres) → format E.164 ; sinon null.
 */
export function normalizePhone(raw: string): string | null {
  const s = raw.trim()
  if (!/^[+\d][\d\s.\-()/]{5,24}$/.test(s)) return null
  let d = s.replace(/[^\d+]/g, '')
  if (d.startsWith('00')) d = `+${d.slice(2)}`
  if ((d.match(/\+/g) ?? []).length > (d.startsWith('+') ? 1 : 0)) return null
  if (d.startsWith('+213')) d = `0${d.slice(4).replace(/^0/, '')}`
  if (!d.startsWith('+')) {
    if (/^0[567]\d{8}$/.test(d)) return `+213${d.slice(1)}`
    if (/^0[234]\d{7}$/.test(d)) return `+213${d.slice(1)}`
    return null
  }
  return /^\+[1-9]\d{7,14}$/.test(d) ? d : null
}
