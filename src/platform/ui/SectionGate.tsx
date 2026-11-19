import 'server-only'
import type { ReactNode } from 'react'
import { sectionGate } from '@/platform/controls/offSections'
import type { Lang3 } from '@/platform/controls/sections'
import { ComingSoon } from './ComingSoon'

const lang3 = (x: unknown): Lang3 => (x === 'en' || x === 'ar' ? x : 'fr')

/**
 * Enveloppe d’une page publique : si sa rubrique ou sa catégorie est coupée (/admin/rubriques), le bloc « revient sous peu »
 * remplace le contenu (statut 200, noindex) ; sinon la page s’affiche normalement. Une lecture en cache (étiquette `controls`).
 */
export function withSectionGate<P>(Page: (props: P) => ReactNode | Promise<ReactNode>, pathOf: (params: Record<string, string>) => string) {
  return async function SectionGated(props: P & { params: Promise<Record<string, string>> }) {
    const params = await props.params
    const lang = lang3(params.lang)
    const message = await sectionGate(pathOf(params), lang)
    if (message) return <ComingSoon lang={lang} message={message} />
    return Page(props)
  }
}

/** Même contrôle pour une fiche dont on connaît le secteur et la catégorie. */
export async function placeGate(path: string, lang: string, place: { sector?: string | null; category?: string | null }) {
  const l = lang3(lang)
  const message = await sectionGate(path, l, place)
  return message ? <ComingSoon lang={l} message={message} /> : null
}
