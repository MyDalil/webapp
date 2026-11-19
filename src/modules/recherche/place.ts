import { WILAYAS } from '@/platform/referentiel/catalog'
import { COMMUNES } from '@/platform/referentiel/communes'
import { WILAYA_VARIANTS, looseWordMatch, placeWords } from '@/platform/referentiel/placeNames'

const OPEN = WILAYAS
/** Wilayas sous tous leurs noms connus (officiel, arabe, anglais, darija, ancien nom) : le libellé reste le nom officiel. */
const WILAYA_NAMES = WILAYAS.flatMap((w) => [w.name, ...(WILAYA_VARIANTS[w.code] ?? [])].map((name) => ({ label: w.name, wilaya: String(w.code), n: placeWords(name) }))).filter((c) => c.n.join(' ').length > 2)
const LINK = new Set(['a', 'au', 'aux', 'en', 'de', 'du', 'pres', 'sur', 'dans', 'vers', 'region'])

/**
 * Lieu dans la phrase (« dentiste à Oran », « plombier Bab El Oued ») : wilaya retenue, mots du lieu retirés de la recherche.
 * Commune d’abord (plus précise), puis wilaya ; le nom le plus long gagne.
 */
export function detectPlace(q: string): { wilaya: string | null; label: string | null; rest: string; near: { lat: number; lng: number } | null } {
  const words = placeWords(q)
  const text = ` ${words.join(' ')} `
  const candidates = [
    ...WILAYA_NAMES.map((w) => ({ name: w.label, wilaya: w.wilaya, rank: 1, lat: null as number | null, lng: null as number | null, n: w.n.join(' ') })),
    ...COMMUNES.map((c) => ({ name: c.name, wilaya: String(c.wilaya), rank: 0, lat: c.lat, lng: c.lng, n: placeWords(c.name).join(' ') })),
  ]
    .filter((c) => c.n.length > 2 && text.includes(` ${c.n} `))
    // Nom le plus long d’abord ; à égalité, la wilaya l’emporte sur une commune homonyme.
    .sort((a, b) => b.n.length - a.n.length || b.rank - a.rank)
  const exact = candidates[0]
  // Sans nom exact : une faute simple tolérée sur le nom d’une wilaya (« constantin », « tlemsen »), mots de 5 lettres et plus.
  const loose = exact ? null : fuzzyWilaya(words)
  if (!exact && !loose) return { wilaya: null, label: null, rest: q, near: null }
  const left = exact ? text.replace(` ${exact.n} `, ' ').trim().split(' ').filter(Boolean) : words.filter((_, i) => i < loose!.start || i >= loose!.start + loose!.size)
  while (left.length && LINK.has(left[left.length - 1])) left.pop()
  const rest = left.join(' ')
  if (loose) return { wilaya: loose.wilaya, label: loose.label, rest: rest.trim(), near: null }
  const hit = exact!
  // Commune ou quartier : son centre sert à classer les adresses par proximité.
  const near = hit.rank === 0 && hit.lat != null && hit.lng != null ? { lat: hit.lat, lng: hit.lng } : null
  return { wilaya: hit.wilaya, label: hit.name, rest: rest.trim(), near }
}

/** Wilaya écrite avec une faute simple : chaque mot ≥ 5 lettres à une lettre près, les mots courts à l’identique. */
function fuzzyWilaya(words: string[]): { wilaya: string; label: string; start: number; size: number } | null {
  const hits = WILAYA_NAMES.flatMap((c) => {
    const size = c.n.length
    if (!c.n.some((w) => w.length >= 5)) return []
    for (let start = 0; start + size <= words.length; start++) {
      if (c.n.every((w, k) => looseWordMatch(words[start + k], w))) return [{ wilaya: c.wilaya, label: c.label, start, size }]
    }
    return []
  })
  // Plusieurs wilayas possibles : rien n’est deviné.
  const distinct = new Set(hits.map((h) => h.wilaya))
  return distinct.size === 1 ? hits.sort((a, b) => b.size - a.size)[0] : null
}
