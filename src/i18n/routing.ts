import { defineRouting } from 'next-intl/routing'

export const locales = ['fr', 'en', 'ar'] as const
export type Locale = (typeof locales)[number]

export const routing = defineRouting({
  locales,
  defaultLocale: 'fr',
  // Le français garde les URL historiques (/annuaire…), /en et /ar sont préfixés.
  localePrefix: 'as-needed',
  localeDetection: false,
})

export const isRtl = (l: string) => l === 'ar'
