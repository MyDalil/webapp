'use client'

import NextLink from 'next/link'
import { forwardRef, type ComponentProps } from 'react'
import { langPath } from '../i18n'
import { useLang } from './lang'

/** Lien du site : garde la langue de la page (/en/…, /ar/…). Même interface que next/link. */
const Link = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(function Link({ href, ...rest }, ref) {
  const lang = useLang()
  const to = typeof href === 'string' ? langPath(lang, href) : href.pathname ? { ...href, pathname: langPath(lang, href.pathname) } : href
  return <NextLink ref={ref} href={to} {...rest} />
})

export default Link
