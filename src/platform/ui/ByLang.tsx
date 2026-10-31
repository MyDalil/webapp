'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { langOf } from '../i18n'

/** Affiche la version qui correspond à la langue de la page (/, /en, /ar). */
export function ByLang({ fr, en, ar }: { fr: ReactNode; en: ReactNode; ar: ReactNode }) {
  return <>{{ fr, en, ar }[langOf(usePathname() || '/')]}</>
}
