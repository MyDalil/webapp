import { COMMUNES } from '@/platform/referentiel/communes'

/**
 * Nom de ville lisible en français pour une valeur importée en arabe ou en écritures mêlées (OpenStreetMap).
 * Jamais d’invention : (1) la partie en lettres latines déjà présente (« kolea القليعة » → « Kolea ») ;
 * (2) sinon le nom français de la commune qui porte exactement ce nom arabe (référentiel Wikidata), dans la
 * même wilaya d’abord, puis dans tout le pays si ce nom arabe y est unique. Sinon : null, la valeur reste telle quelle.
 */
const ARABIC = /[؀-ۿ]/
const norm = (s: string) =>
  s.normalize('NFKD').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim()

const byWilaya = new Map<string, string>()
const unique = new Map<string, string | null>()
for (const c of COMMUNES) {
  if (!c.ar) continue
  const k = norm(c.ar.split(/[،,]/)[0]) // « القنطرة، بسكرة » : la précision de wilaya n’est pas dans les données importées
  byWilaya.set(`${c.wilaya}|${k}`, c.name)
  unique.set(k, unique.has(k) && unique.get(k) !== c.name ? null : c.name)
}

export function frenchCity(city: string, wilaya?: string | number | null): string | null {
  if (!ARABIC.test(city)) return null
  const latin = city.replace(/[^A-Za-zÀ-ÿ' -]/g, ' ').replace(/\s+/g, ' ').trim()
  if (latin.replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 3) return latin.charAt(0).toUpperCase() + latin.slice(1)
  const k = norm(city.replace(/[^؀-ۿ ]/g, ' '))
  return byWilaya.get(`${Number(wilaya)}|${k}`) ?? unique.get(k) ?? null
}
