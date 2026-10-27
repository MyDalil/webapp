import { SECTORS } from '@/platform/referentiel/catalog'
import { searchWords } from '@/platform/search/store'

/** Mot au singulier, sans accent (« hôpitaux » → « hopital », « mosquées » → « mosquee »). */
const one = (w: string) => w.replace(/aux$/, 'al').replace(/[sx]$/, '')
const key = (s: string) => searchWords(s).map(one).join(' ')
const SYNONYMS: Record<string, string> = { masjid: 'Mosquées', mosque: 'Mosquées', 'salle de priere': 'Salles de prière', hopital: 'Hôpitaux', clinique: 'Cliniques', pharmacie: 'Pharmacies' }
const INDEX = SECTORS.flatMap((s) => s.categories.map((c) => ({ sector: s.slug, category: c, k: key(c) })))

/** Catégorie de l’annuaire que la recherche nomme exactement (« mosquée », « pharmacies »), sinon null. */
export function categoryOf(text: string): { sector: string; category: string } | null {
  const k = key(text)
  if (!k) return null
  const syn = SYNONYMS[k]
  const hit = INDEX.find((x) => x.k === k || (syn && x.category === syn))
  return hit ? { sector: hit.sector, category: hit.category } : null
}

/**
 * Catégorie en tête de phrase, suivie d’un nom (« mosquée Cheikh Bachir Ibrahimi » → Mosquées + « cheikh bachir ibrahimi »).
 * Le nom sert ensuite à trier les adresses proches : les plus ressemblantes d’abord.
 */
export function categoryPrefix(text: string): { sector: string; category: string; name: string } | null {
  const w = searchWords(text)
  for (let n = Math.min(3, w.length - 1); n >= 1; n--) {
    const c = categoryOf(w.slice(0, n).join(' '))
    if (c) return { ...c, name: w.slice(n).join(' ') }
  }
  return null
}

/** Ressemblance d’un nom à la recherche : part des mots cherchés retrouvés (fautes légères tolérées, « cheick » ≈ « cheikh »). */
export function nameMatch(query: string, title: string): number {
  const q = searchWords(query).filter((x) => x.length > 2)
  const t = searchWords(title).flatMap((x) => x.split('-')).filter((x) => x.length > 2)
  if (!q.length || !t.length) return 0
  const close = (a: string, b: string) => {
    if (a === b || (a.length >= 4 && (b.startsWith(a) || a.startsWith(b)))) return true
    // Même début (4 lettres) sur des mots longs : variantes d’écriture (« cheick », « cheikh », « chikh »).
    if (a.length >= 5 && b.length >= 5 && a.slice(0, 4) === b.slice(0, 4)) return true
    if (Math.abs(a.length - b.length) > 1) return false
    let diff = 0
    for (let i = 0, j = 0; i < a.length || j < b.length; ) {
      if (a[i] === b[j]) { i++; j++; continue }
      if (++diff > 1) return false
      if (a.length > b.length) i++
      else if (b.length > a.length) j++
      else { i++; j++ }
    }
    return true
  }
  return q.filter((x) => t.some((y) => close(x, y))).length / q.length
}
