/**
 * Normalise un texte pour la recherche : minuscules, sans accents latins,
 * sans diacritiques arabes (tashkil), sans tatweel, alif/ya/ta marbuta unifiés.
 */
export function normalize(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents latins
    .replace(/[ً-ٰٟـ]/g, '') // tashkil + tatweel
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .replace(/[’'`]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function slugify(input: string): string {
  return normalize(input)
    .replace(/[^a-z0-9؀-ۿ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 96)
}

/** Extrait le texte brut d'un état Lexical (rich text Payload). */
export function lexicalToText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as { text?: string; children?: unknown[]; root?: unknown }
  if (n.root) return lexicalToText(n.root)
  let out = typeof n.text === 'string' ? n.text : ''
  if (Array.isArray(n.children)) out += ' ' + n.children.map(lexicalToText).join(' ')
  return out
}
