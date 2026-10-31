'use client'

import { createContext, useContext, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { langPath, stripLang, type Lang } from '../i18n'

const LangContext = createContext<Lang>('fr')

/** Langue de la page, fixée par le serveur (segment [lang]) : identique au rendu serveur et dans le navigateur. */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)

/** Chemin de la page sans préfixe de langue (stable entre serveur et navigateur malgré la réécriture /x → /fr/x). */
export const usePath = () => stripLang(usePathname() || '/')

/** Routeur qui garde la langue de la page. */
export function useLangRouter() {
  const router = useRouter()
  const lang = useLang()
  return useMemo(
    () => ({
      ...router,
      push: (href: string, o?: Parameters<typeof router.push>[1]) => router.push(langPath(lang, href), o),
      replace: (href: string, o?: Parameters<typeof router.replace>[1]) => router.replace(langPath(lang, href), o),
      prefetch: (href: string) => router.prefetch(langPath(lang, href)),
    }),
    [router, lang],
  )
}
