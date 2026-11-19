import type { Metadata } from 'next'
import { isLang, langPath, LANGS_ALL, type Lang } from '../i18n'
import { SITE } from '../site'

export const OG_LOCALE: Record<Lang, string> = { fr: 'fr_DZ', en: 'en_GB', ar: 'ar_DZ' }

export const asLang = (l: string | undefined): Lang => (isLang(l) ? l : 'fr')

/** Adresse absolue et canonique d’une page dans une langue (/x en français, /en/x, /ar/x). */
export const absoluteUrl = (lang: Lang, path: string) => `${SITE}${langPath(lang, path)}`

/** Adresse absolue d’une photo ou d’un fichier du site. */
export const absoluteAsset = (src: string | null | undefined) => (src ? (/^https?:\/\//.test(src) ? src : `${SITE}${src.startsWith('/') ? '' : '/'}${src}`) : undefined)

/** Description factuelle : phrases présentes seulement, coupée proprement à 160 caractères. */
export function factualDescription(parts: (string | null | undefined | false)[], max = 160): string {
  const text = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).replace(/[\s,;:·—-]+$/, '')}…`
}

/**
 * Métadonnées complètes d’une fiche : canonique, langues, Open Graph et Twitter.
 * L’image vient du fichier opengraph-image du segment (prioritaire), jamais d’ici.
 */
export function ficheMetadata(o: { lang: Lang; path: string; title: string; description?: string; type?: 'website' | 'article' }): Metadata {
  const url = absoluteUrl(o.lang, o.path)
  return {
    title: o.title,
    description: o.description || undefined,
    alternates: {
      canonical: url,
      languages: { ...Object.fromEntries(LANGS_ALL.map((l) => [l === 'ar' ? 'ar-DZ' : l === 'fr' ? 'fr-DZ' : 'en', absoluteUrl(l, o.path)])), 'x-default': absoluteUrl('fr', o.path) },
    },
    openGraph: {
      type: o.type ?? 'website',
      siteName: 'DALIL',
      locale: OG_LOCALE[o.lang],
      alternateLocale: LANGS_ALL.filter((l) => l !== o.lang).map((l) => OG_LOCALE[l]),
      url,
      title: o.title,
      description: o.description || undefined,
    },
    twitter: { card: 'summary_large_image', title: o.title, description: o.description || undefined },
  }
}
