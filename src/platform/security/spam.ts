/**
 * Signaux d’envoi automatique, sans service tiers.
 * Vague observée en nov. 2026 : « Lrxivwzz LLC », « Dkofizpdyx LLC », « Bhdippnt LLC » — nom aléatoire + forme juridique US.
 */
const LEGAL = /\s+(llc|inc\.?|ltd\.?|corp\.?|co\.?)$/i

/** Un mot qui ne ressemble à aucun mot réel : longues suites de consonnes ou presque aucune voyelle. */
export function gibberishWord(w: string): boolean {
  const s = w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (!/^[a-z]{6,}$/.test(s)) return false
  const vowels = (s.match(/[aeiou]/g) ?? []).length
  if (vowels / s.length < 0.3) return true
  return /[^aeiou]{4,}/.test(s)
}

/** Nom d’activité typique des robots : un seul mot aléatoire, souvent suivi de « LLC ». */
export function looksLikeBotName(name: string): boolean {
  const n = name.trim()
  const core = n.replace(LEGAL, '')
  const words = core.split(/\s+/).filter(Boolean)
  if (words.length !== 1) return false
  // Une entreprise algérienne est SARL, EURL, SPA… : un mot seul + « LLC/Inc » est la signature de ces robots.
  return gibberishWord(words[0]) || LEGAL.test(n)
}
