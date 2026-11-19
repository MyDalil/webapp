import { SECTORS } from '@/platform/referentiel/catalog'
import { slugify } from '@/platform/referentiel/slug'
import { RUBRICS, type Rubric } from '@/platform/shell/nav'

/**
 * Interrupteurs de rubriques et de catégories (logique pure, testée dans sections.test.ts).
 * Clés : rubrique du menu `r:<clé>` (RUBRICS), catégorie de l’annuaire `c:<secteur>/<catégorie en slug>` (SECTORS).
 * Une rubrique coupée coupe aussi les catégories des secteurs qu’elle couvre (`/annuaire/<secteur>` dans son `match`).
 */
export type Lang3 = 'fr' | 'en' | 'ar'
export const rubricKey = (key: Rubric['key']) => `r:${key}`
export const categoryKey = (sector: string, category: string) => `c:${sector}/${slugify(category)}`

/** Secteurs de l’annuaire couverts par une rubrique du menu. */
export const sectorsOf = (r: Rubric) => SECTORS.filter((s) => r.match.includes(`/annuaire/${s.slug}`)).map((s) => s.slug)

export type SectionNode = { key: string; label: string; categories: { key: string; label: string; sector: string }[] }

/** Arbre affiché dans /admin/rubriques : rubriques du menu, chaque secteur listé une fois (première rubrique), puis le reste. */
export function sectionTree(): SectionNode[] {
  const seen = new Set<string>()
  const cats = (slugs: string[]) =>
    slugs
      .filter((s) => !seen.has(s) && seen.add(s))
      .flatMap((slug) => {
        const s = SECTORS.find((x) => x.slug === slug)!
        return s.categories.map((c) => ({ key: categoryKey(s.slug, c), label: c, sector: s.title }))
      })
  const tree: SectionNode[] = RUBRICS.map((r) => ({ key: rubricKey(r.key), label: r.label, categories: cats(sectorsOf(r)) }))
  const rest = cats(SECTORS.map((s) => s.slug))
  if (rest.length) tree.push({ key: '', label: 'Autres catégories de l’annuaire', categories: rest })
  return tree
}

const ALL_KEYS = new Set(sectionTree().flatMap((n) => [n.key, ...n.categories.map((c) => c.key)]).filter(Boolean))
export const isSectionKey = (k: unknown): k is string => typeof k === 'string' && ALL_KEYS.has(k)

/** Valeur enregistrée → liste propre de clés connues, sans doublon (une clé inconnue est ignorée). */
export const normalizeOff = (v: unknown): string[] => (Array.isArray(v) ? [...new Set(v.filter(isSectionKey))].sort() : [])

/** Ajoute ou retire une clé. */
export const toggleOff = (current: unknown, key: string, off: boolean): string[] => {
  const set = new Set(normalizeOff(current))
  if (off) set.add(key)
  else set.delete(key)
  return [...set].sort()
}

/** Ensemble effectif : clés coupées + catégories des secteurs couverts par une rubrique coupée. */
export function effectiveOff(off: readonly string[]): Set<string> {
  const out = new Set(off)
  for (const r of RUBRICS)
    if (out.has(rubricKey(r.key)))
      for (const slug of sectorsOf(r)) for (const c of SECTORS.find((s) => s.slug === slug)!.categories) out.add(categoryKey(slug, c))
  return out
}

/** Rubriques propriétaires d’un chemin : la correspondance la plus précise (à égalité, toutes). */
function rubricsOfPath(path: string): Rubric[] {
  let best = 0
  let owners: Rubric[] = []
  for (const r of RUBRICS)
    for (const m of r.match)
      if (path === m || path.startsWith(m + '/')) {
        if (m.length > best) (best = m.length), (owners = [r])
        else if (m.length === best && !owners.includes(r)) owners.push(r)
      }
  return owners
}

/** Clé coupée qui concerne une adresse de page publique (sans préfixe de langue), ou null. */
export function offKeyForPath(url: string, off: Set<string>): string | null {
  if (!off.size) return null
  const u = new URL(url, 'https://x')
  const path = u.pathname.replace(/\/+$/, '') || '/'
  const m = /^\/annuaire\/([^/]+)(?:\/([^/]+))?/.exec(path)
  if (m) {
    const s = SECTORS.find((x) => x.slug === m[1])
    const cat = m[2] ? s?.categories.find((c) => slugify(c) === m[2]) : u.searchParams.get('category') ?? undefined
    if (s && cat && off.has(categoryKey(s.slug, cat))) return categoryKey(s.slug, cat)
    // Page d’un secteur dont toutes les catégories sont coupées.
    if (s && !cat && s.categories.every((c) => off.has(categoryKey(s.slug, c)))) return categoryKey(s.slug, s.categories[0])
  }
  for (const r of rubricsOfPath(path)) if (off.has(rubricKey(r.key))) return rubricKey(r.key)
  return null
}

/** Clé coupée qui concerne une fiche (secteur et catégorie connus), ou null. */
export const offKeyForPlace = (sector: string | null | undefined, category: string | null | undefined, off: Set<string>) =>
  sector && category && off.has(categoryKey(sector, category)) ? categoryKey(sector, category) : null

/** Une catégorie (par son nom) est-elle coupée dans au moins un secteur ? (résultats de recherche sans secteur) */
export const categoryNameOff = (category: string | null | undefined, off: Set<string>) =>
  Boolean(category) && SECTORS.some((s) => s.categories.includes(category!) && off.has(categoryKey(s.slug, category!)))

type Hit = { type: string; url: string; subtitle?: string | null }
/** Résultat de recherche à retirer : sa page est coupée, ou c’est une adresse d’une catégorie coupée. */
export function hitOff(h: Hit, off: Set<string>): boolean {
  if (!off.size) return false
  if (offKeyForPath(h.url, off)) return true
  return h.type === 'adresse' && categoryNameOff(h.subtitle?.split(' · ')[0], off)
}

export const DEFAULT_OFF_MESSAGE: Record<Lang3, string> = {
  fr: 'Cette rubrique revient sous peu.',
  en: 'This section is coming back soon.',
  ar: 'هذا القسم سيعود قريبًا.',
}
/** Message public : le texte saisi dans /admin (français) remplace le défaut français ; EN et AR gardent leur défaut. */
export const offMessageFor = (lang: Lang3, custom?: string | null) => (lang === 'fr' && custom?.trim() ? custom.trim().slice(0, 300) : DEFAULT_OFF_MESSAGE[lang])

/** Pages publiques (sans langue) à rafraîchir quand ces clés changent. */
export function pathsForKeys(keys: readonly string[]): string[] {
  const out = new Set<string>()
  for (const k of keys) {
    if (k.startsWith('r:')) {
      const r = RUBRICS.find((x) => rubricKey(x.key) === k)
      if (!r) continue
      if (r.href) out.add(r.href)
      for (const m of r.match) out.add(m)
      for (const e of r.entries) out.add(e[0].split(/[?#]/)[0])
      for (const slug of sectorsOf(r)) for (const c of SECTORS.find((s) => s.slug === slug)!.categories) out.add(`/annuaire/${slug}/${slugify(c)}`)
    } else if (k.startsWith('c:')) {
      const [sector, cat] = k.slice(2).split('/')
      out.add(`/annuaire/${sector}`)
      out.add(`/annuaire/${sector}/${cat}`)
    }
  }
  return [...out].filter((p) => p.startsWith('/'))
}
