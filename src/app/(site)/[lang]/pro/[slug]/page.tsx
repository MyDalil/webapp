import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import Link from '@/platform/ui/Link'
import { proPage } from '@/modules/pros'
import { partnerBadge, proText as t, shortLink } from '@/modules/pros/ui'
import { isLang, type Lang } from '@/platform/i18n'
import { JsonLd } from '@/platform/seo/JsonLd'
import { placeJsonLd } from '@/platform/seo/jsonLd'
import { absoluteUrl, factualDescription, ficheMetadata } from '@/platform/seo/metadata'

type Props = { params: Promise<{ lang: string; slug: string }> }
export const revalidate = 3600

const load = cache((slug: string) => proPage(slug))
const langOf = (l: string): Lang => (isLang(l) ? l : 'fr')

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params
  const p = await load(slug)
  if (!p) return { title: 'Page introuvable', robots: { index: false } }
  // Page courte (lien à partager) : la fiche complète reste la page de référence.
  return { ...ficheMetadata({ lang: langOf(lang), path: `/pro/${slug}`, title: p.name, description: factualDescription([p.category, p.city, p.intro]) }), alternates: { canonical: absoluteUrl(langOf(lang), p.path) } }
}

/** Page pro courte (/pro/slug, lien court /@slug) : établissement publié et catalogue simple du même compte. */
export default async function ProShort({ params }: Props) {
  const { lang: l, slug } = await params
  const lang = langOf(l)
  const p = await load(slug)
  if (!p) notFound()
  const partner = partnerBadge(p.plan)
  return (
    <section className="auth-page auth-narrow container account-page">
      <JsonLd data={placeJsonLd({ name: p.name, url: absoluteUrl(lang, p.path), lang, category: p.category, description: p.intro, phone: p.phone })} />
      <p className="eyebrow">{[p.category, p.city].filter(Boolean).join(' · ')}</p>
      <h1>{p.name}</h1>
      <div className="button-row">
        {p.verified && <span className="verified-badge">{t('Vérifié sur DALIL', lang)}</span>}
        {partner && <span className="chip chip-plain">{t(partner, lang)}</span>}
      </div>
      {p.intro && <p className="auth-lead">{p.intro}</p>}
      <div className="button-row">
        {p.phone && (
          <a className="button primary" href={`tel:${p.phone.replace(/[^\d+]/g, '')}`} dir="ltr">
            {p.phone}
          </a>
        )}
        <Link className="button outline" href={p.path}>
          {t('Voir la fiche complète', lang)}
        </Link>
      </div>
      {p.catalog.length > 0 && (
        <section className="account-block">
          <h2>{t('Services et annonces', lang)}</h2>
          <ul className="account-facts">
            {p.catalog.map((c) => (
              <li key={c.href}>
                <Link href={c.href}>{c.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="muted-line" dir="ltr">
        {shortLink(p.slug)}
      </p>
    </section>
  )
}
