import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import Link from '@/platform/ui/Link'
import { momentBySlug } from '@/modules/contenus'
import { XpHero } from '@/platform/ui/Xp'

type Props = { params: Promise<{ lang: string; slug: string }> }
export const revalidate = 3600
// Aucune page au build : chacune existe seulement quand l’équipe publie un moment en cours (sinon 404).
export const generateStaticParams = async () => []

const BACK = { fr: 'Accueil', en: 'Home', ar: 'الرئيسية' } as const
const LINKS = { fr: 'Pour aller plus loin', en: 'Further reading', ar: 'للمزيد' } as const
const langOf = (l: string) => (l === 'en' || l === 'ar' ? l : 'fr')

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params
  const m = await momentBySlug(slug, langOf(lang)).catch(() => null)
  return m ? { title: m.title, description: m.summary ?? undefined } : {}
}

/** Page saisonnière (gabarit des guides) : contenu saisi par l’équipe dans /admin, rien de pré-rempli. */
export default async function MomentPage({ params }: Props) {
  const { lang, slug } = await params
  const l = langOf(lang)
  const m = await momentBySlug(slug, l)
  if (!m) notFound()
  const links = (m.links ?? []).filter((x): x is { label: string; url: string } => Boolean(x.label?.trim() && x.url && /^(https:\/\/|\/)/.test(x.url)))
  return (
    <article className="xp g-page">
      <XpHero compact eyebrow={l === 'fr' ? 'En ce moment' : l === 'en' ? 'Right now' : 'الآن'} title={m.title} lead={m.summary ?? undefined} back={{ href: '/', label: BACK[l] }} />
      <div className="container xp-narrow xp-body">
        {Boolean(m.body) && (
          <section className="sr-group">
            <RichText data={m.body as SerializedEditorState} />
          </section>
        )}
        {links.length > 0 && (
          <section className="sr-group" aria-label={LINKS[l]}>
            <h2>{LINKS[l]}</h2>
            <ul className="sr-list">
              {links.map((x) => (
                <li key={x.url}>
                  <Link href={x.url} className="sr-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
                    <span className="sr-text">
                      <b>{x.label}</b>
                    </span>
                    <span className="sr-chev" aria-hidden="true">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  )
}
