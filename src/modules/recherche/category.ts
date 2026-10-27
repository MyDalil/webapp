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
