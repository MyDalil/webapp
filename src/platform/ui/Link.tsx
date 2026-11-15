'use client'

import NextLink from 'next/link'
import { forwardRef, type ComponentProps } from 'react'
import { langPath } from '../i18n'
import { useLang } from './lang'

/**
 * Lien du site : garde la langue de la page (/en/…, /ar/…). Même interface que next/link.
 * Préchargement coupé par défaut (coût) : sinon chaque lien affiché appelle le serveur — 250 requêtes mesurées
 * pour une page de liste. Les pages publiques viennent du cache : la navigation reste rapide sans préchargement.
 * `prefetch` explicite reste possible pour un lien précis.
 */
const Link = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(function Link({ href, prefetch = false, ...rest }, ref) {
  const lang = useLang()
  const to = typeof href === 'string' ? langPath(lang, href) : href.pathname ? { ...href, pathname: langPath(lang, href.pathname) } : href
  return <NextLink ref={ref} href={to} prefetch={prefetch} {...rest} />
})

export default Link
