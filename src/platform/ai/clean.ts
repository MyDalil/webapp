/**
 * Nettoyage simple d’un texte dicté, sans IA (secours gratuit, et pour les visiteurs sans compte) :
 * hésitations retirées, bégaiements fusionnés, espaces et ponctuation remis en ordre, majuscule initiale.
 * Ne comprend pas les corrections orales (« quatre… non, six ») : c’est le rôle de la reformulation par l’IA.
 */
const FILLERS = ['euh+', 'heu+', 'hum+', 'hm+', 'bah', 'ben', 'euhm', 'uh+', 'um+', 'erm', 'emm+']
const FILLER_RE = new RegExp(`(^|[\\s,.;!?…])(?:${FILLERS.join('|')})(?=$|[\\s,.;!?…])[,…]*`, 'giu')

export function simpleClean(input: string, opts: { sentence?: boolean } = {}) {
  let s = ` ${input} `.replace(/\s+/g, ' ')
  // Hésitations (plusieurs passes : « euh euh »).
  for (let i = 0; i < 3; i++) s = s.replace(FILLER_RE, '$1')
  // Bégaiements : un même mot ou groupe de 2–3 mots répété immédiatement.
  s = s.replace(/(^|\s)((?:[\p{L}\p{N}’'-]+\s){0,2}[\p{L}\p{N}’'-]+)(?:\s+\2)+(?=\s|[,.;!?…]|$)/giu, '$1$2')
  s = s
    .replace(/\s+([,.;!?…])/g, (_m, p: string) => (p === '?' || p === '!' || p === ';' ? ` ${p}` : p)) // espace fine française avant ? ! ;
    .replace(/([,.;!?…])(?=[\p{L}\p{N}])/gu, '$1 ')
    .replace(/,\s*([.!?…])/g, '$1')
    .replace(/^[\s,.;…]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s) return ''
  s = s.charAt(0).toLocaleUpperCase('fr') + s.slice(1)
  if (opts.sentence && !/[.!?…]$/.test(s)) s += '.'
  return s
}
