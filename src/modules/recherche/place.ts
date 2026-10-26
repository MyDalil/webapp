import { WILAYAS } from '@/platform/referentiel/catalog'
import { COMMUNES } from '@/platform/referentiel/communes'
import { searchWords } from '@/platform/search/store'

const OPEN = WILAYAS.filter((w) => !w.transition)
const LINK = new Set(['a', 'au', 'aux', 'en', 'de', 'du', 'pres', 'sur', 'dans', 'vers', 'region'])

/**
 * Lieu dans la phrase (« dentiste à Oran », « plombier Bab El Oued ») : wilaya retenue, mots du lieu retirés de la recherche.
 * Commune d’abord (plus précise), puis wilaya ; le nom le plus long gagne.
 */
export function detectPlace(q: string): { wilaya: string | null; label: string | null; rest: string } {
  const words = searchWords(q)
  const text = ` ${words.join(' ')} `
  const candidates = [
    ...OPEN.map((w) => ({ name: w.name, wilaya: String(w.code), rank: 1 })),
    ...COMMUNES.map((c) => ({ name: c.name, wilaya: String(c.wilaya), rank: 0 })),
  ]
    .map((c) => ({ ...c, n: searchWords(c.name).join(' ') }))
    .filter((c) => c.n.length > 2 && text.includes(` ${c.n} `))
    // Nom le plus long d’abord ; à égalité, la wilaya l’emporte sur une commune homonyme.
    .sort((a, b) => b.n.length - a.n.length || b.rank - a.rank)
  const hit = candidates[0]
  if (!hit) return { wilaya: null, label: null, rest: q }
  const left = text.replace(` ${hit.n} `, ' ').trim().split(' ').filter(Boolean)
  while (left.length && LINK.has(left[left.length - 1])) left.pop()
  const rest = left.join(' ')
  return { wilaya: hit.wilaya, label: hit.name, rest: rest.trim() }
}

