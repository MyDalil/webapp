import { WILAYAS } from '@/platform/referentiel/catalog'

/** Champs d’entrée réutilisés par les actions (JSON Schema) et petites conversions. */
export const S = {
  texte: (description: string, maxLength = 200) => ({ type: 'string', description, maxLength }),
  wilaya: { type: 'string', maxLength: 60, description: 'Wilaya : nom (« Alger », « Oran ») ou code (« 16 »).' },
  limite: { type: 'integer', minimum: 1, maximum: 50, description: 'Nombre maximum de résultats (défaut 10).' },
  slug: { type: 'string', maxLength: 300, description: 'Identifiant de la page (slug) ou adresse complète https://www.mydalil.com/…' },
} as const

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** « Alger », « alger », « 16 » → « 16 » ; inconnu → null. */
export function wilayaCode(v: unknown): string | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null
  const s = String(v).trim()
  if (/^\d{1,2}$/.test(s)) return WILAYAS.some((w) => w.code === Number(s)) ? String(Number(s)) : null
  const f = fold(s)
  return WILAYAS.find((w) => fold(w.name) === f) ? String(WILAYAS.find((w) => fold(w.name) === f)!.code) : null
}

export const wilayaLabel = (code?: string | number | null) => (code == null ? null : (WILAYAS.find((w) => String(w.code) === String(code))?.name ?? null))

export const limitOf = (v: unknown, d = 10) => (typeof v === 'number' && v > 0 ? Math.min(50, Math.floor(v)) : d)

/** Tous les mots de la recherche figurent dans le texte (sans accent ni casse). */
export const matchesWords = (text: string, q: unknown) => {
  if (typeof q !== 'string' || !q.trim()) return true
  const t = fold(text)
  return fold(q).split(' ').filter(Boolean).every((w) => t.includes(w))
}
