import Image from 'next/image'
import { getFormatter, getTranslations } from 'next-intl/server'
import { ArrowUpRight, BadgeCheck, MapPin, Award } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { pick, tx } from '@/lib/data'
import { T } from './Localized'
import { Khatam } from './Brand'
import type { Locale } from '@/i18n/routing'
import type { Guide, Listing, Media, Article, Sector, Wilaya } from '@/payload-types'

export function MediaImage({ media, locale, sizes, className, priority }: { media?: number | Media | null; locale: Locale; sizes: string; className?: string; priority?: boolean }) {
  if (!media || typeof media !== 'object' || !media.url) return null
  return (
    <Image
      src={media.url}
      alt={tx(media.alt as never, locale)}
      fill
      sizes={sizes}
      priority={priority}
      className={className ?? 'object-cover'}
      style={media.focalX != null ? { objectPosition: `${media.focalX}% ${media.focalY}%` } : undefined}
    />
  )
}

/** Visuel de repli : trame zellige + étoile, jamais de bloc gris. */
function Placeholder({ seed = 0 }: { seed?: number }) {
  const tones = ['bg-sea-soft', 'bg-terra-soft', 'bg-casbah-soft']
  return (
    <div className={`zellige absolute inset-0 grid place-items-center ${tones[seed % 3]}`}>
      <Khatam className="h-10 w-10 text-sea/40" />
    </div>
  )
}

export async function ListingCard({ l, locale }: { l: Listing; locale: Locale }) {
  const t = await getTranslations('directory')
  const sector = typeof l.sector === 'object' ? (l.sector as Sector) : null
  const wilaya = typeof l.wilaya === 'object' ? (l.wilaya as Wilaya) : null
  return (
    <Link href={`/annuaire/${sector?.slug ?? 'secteur'}/${l.slug}`} className="card group flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden">
        {l.cover ? <MediaImage media={l.cover as Media} locale={locale} sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <Placeholder seed={l.id} />}
        {l.label && (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink/85 px-2.5 py-1 text-xs font-semibold text-paper">
            <Award className="h-3.5 w-3.5" aria-hidden="true" /> {t('label')}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <T v={l.name as never} locale={locale} as="h3" className="font-display text-xl leading-snug text-ink" />
        <T v={l.summary as never} locale={locale} as="p" className="mt-2 line-clamp-2 text-[0.95rem] text-ink-2" />
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-sm text-muted">
          {(wilaya || l.commune) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {[l.commune, wilaya ? tx(wilaya.name as never, locale) : null].filter(Boolean).join(', ')}
            </span>
          )}
          {l.verification !== 'unverified' && (
            <span className="inline-flex items-center gap-1 text-casbah">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              {t(l.verification === 'claimed' ? 'claimed' : 'verified')}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export async function GuideCard({ g, locale, index }: { g: Guide; locale: Locale; index?: number }) {
  const t = await getTranslations('guides')
  const steps = g.checklist?.length ?? 0
  return (
    <Link href={`/guides/${g.slug}`} className="card group flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-4">
        {index != null ? (
          <span className="num text-3xl text-terra">{String(index + 1).padStart(2, '0')}</span>
        ) : (
          <Khatam className="h-6 w-6 text-terra" />
        )}
        <ArrowUpRight className="h-5 w-5 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-sea rtl:-scale-x-100" aria-hidden="true" />
      </div>
      <T v={g.title as never} locale={locale} as="h3" className="mt-6 font-display text-[1.35rem] leading-snug text-ink" />
      <T v={g.summary as never} locale={locale} as="p" className="mt-2 text-[0.95rem] text-ink-2" />
      {steps > 0 && (
        <p className="mt-auto pt-5 text-sm font-medium text-muted">
          {steps} {t('steps').toLowerCase()}
        </p>
      )}
    </Link>
  )
}

export async function ArticleCard({ a, locale }: { a: Article; locale: Locale }) {
  const f = await getFormatter()
  const cat = a.category
  return (
    <Link href={`/actualites/${a.slug}`} className="card group flex flex-col overflow-hidden">
      <div className="relative aspect-[16/9]">{a.cover ? <MediaImage media={a.cover as Media} locale={locale} sizes="(min-width:1024px) 33vw, 100vw" /> : <Placeholder seed={a.id} />}</div>
      <div className="p-5">
        <p className="kicker">{cat}</p>
        <T v={a.title as never} locale={locale} as="h3" className="mt-2 font-display text-xl leading-snug" />
        {a.publishedAt && <p className="mt-3 text-sm text-muted">{f.dateTime(new Date(a.publishedAt), { dateStyle: 'long' })}</p>}
      </div>
    </Link>
  )
}

export function SectionHead({ kicker, title, lead, action }: { kicker?: string; title: string; lead?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {kicker && <p className="kicker">{kicker}</p>}
        <h2 className="mt-2 text-[2rem] leading-[1.1] text-ink md:text-[2.6rem]">{title}</h2>
        {lead && <p className="mt-3 text-lg text-ink-2">{lead}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHero({ kicker, title, lead, children }: { kicker?: string; title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <section className="zellige border-b border-line">
      <div className="wrap py-14 md:py-20">
        {kicker && <p className="kicker">{kicker}</p>}
        <h1 className="mt-3 max-w-4xl text-[2.4rem] leading-[1.05] text-ink md:text-[3.6rem]">{title}</h1>
        {lead && <p className="mt-5 max-w-2xl text-lg text-ink-2 md:text-xl">{lead}</p>}
        {children}
      </div>
    </section>
  )
}

export { pick }
