import type { ElementType, ReactNode } from 'react'
import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { pick, type L } from '@/lib/data'
import type { Locale } from '@/i18n/routing'

/**
 * Affiche une valeur localisée. Si la langue demandée manque et qu’on retombe
 * sur une autre, on pose lang/dir sur l’élément : lecteur d’écran et typographie restent justes.
 */
export function T({ v, locale, as: As = 'span', className }: { v: L; locale: Locale; as?: ElementType; className?: string }) {
  const p = pick<string>(v, locale)
  if (!p.value) return null
  const props = p.fallback ? { lang: p.lang, dir: p.lang === 'ar' ? 'rtl' : 'ltr' } : {}
  return (
    <As className={className} {...props}>
      {p.value}
    </As>
  )
}

export function Rich({ v, locale, className }: { v: L<unknown>; locale: Locale; className?: string }) {
  const p = pick<unknown>(v, locale)
  const data = p.value as SerializedEditorState | undefined
  if (!data?.root?.children?.length) return null
  const props = p.fallback ? { lang: p.lang, dir: p.lang === 'ar' ? 'rtl' : 'ltr' } : {}
  return (
    <div className={className ?? 'prose-dalil'} {...props}>
      <LexicalRichText data={data} />
    </div>
  )
}

export function FallbackNotice({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null
  return (
    <p className="mb-6 rounded-xl border border-line bg-sunk px-4 py-3 text-sm text-ink-2" role="note">
      {children}
    </p>
  )
}
