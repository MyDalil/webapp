import type { Lang } from './types'

/** Adresse publique absolue d’une page (toujours le site de production, préfixe de langue hors français). */
export const SITE_BASE = 'https://www.mydalil.com'

export function absoluteUrl(path: string, lang: Lang = 'fr'): string {
  if (/^https?:\/\//.test(path)) return path
  const p = path.startsWith('/') ? path : `/${path}`
  return `${SITE_BASE}${lang === 'fr' ? '' : `/${lang}`}${p === '/' && lang !== 'fr' ? '' : p}`
}

/** Dernier segment utile d’une adresse ou d’un slug : « https://www.mydalil.com/adresses/x?y » → « x ». */
export function slugFrom(v: string): string {
  const clean = v.trim().split(/[?#]/)[0].replace(/\/+$/, '')
  return decodeURIComponent(clean.slice(clean.lastIndexOf('/') + 1))
}
