import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Logo } from './Brand'
import { NewsletterForm } from './Forms'
import type { Locale } from '@/i18n/routing'
import { payload } from '@/lib/data'

export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations('footer')
  const n = await getTranslations('nav')
  const f = await getTranslations('forms')
  const p = await payload()
  const published = new Set(
    (await p.find({ collection: 'pages', where: { _status: { equals: 'published' } }, limit: 100, depth: 0, select: { slug: true } })).docs.map((d) => `/${d.slug}`),
  )
  const PAGE_LINKS = new Set(['/methode', '/label', '/charte-professionnels', '/mentions-legales', '/confidentialite', '/cookies', '/conditions-utilisation', '/credits-photos'])
  const visible = (href: string) => !PAGE_LINKS.has(href) || published.has(href)
  const cols = [
    {
      title: t('explore'),
      links: [
        ['/explorer', n('explorer')],
        ['/installation', n('installation')],
        ['/demarches', n('demarches')],
        ['/vie-pratique', n('quotidien')],
        ['/business-emploi', n('business')],
      ],
    },
    {
      title: t('services'),
      links: [
        ['/annuaire', n('annuaire')],
        ['/guides', n('guides')],
        ['/actualites', n('actualites')],
        ['/proposer', n('propose')],
        ['/professionnels', n('pro')],
      ],
    },
    {
      title: t('trust'),
      links: [
        ['/methode', t('method')],
        ['/label', t('labelPage')],
        ['/charte-professionnels', t('charter')],
        ['/feedback', f('feedbackTitle')],
      ],
    },
    {
      title: t('legal'),
      links: [
        ['/mentions-legales', t('legalNotice')],
        ['/confidentialite', t('privacy')],
        ['/cookies', t('cookies')],
        ['/conditions-utilisation', t('terms')],
        ['/credits-photos', t('credits')],
      ],
    },
  ]
  return (
    <footer className="mt-24 border-t border-line bg-sunk pb-24 md:pb-0">
      <div className="wrap grid gap-12 py-14 lg:grid-cols-[1.2fr_2fr]">
        <div className="max-w-sm">
          <Logo locale={locale} />
          <p className="mt-5 text-[0.95rem] text-ink-2">{t('about')}</p>
          <div className="mt-8">
            <p className="font-display text-lg text-ink">{f('newsletterTitle')}</p>
            <p className="mb-3 mt-1 text-sm text-muted">{f('newsletterText')}</p>
            <NewsletterForm compact />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {cols.map((c) => (
            <div key={c.title}>
              <p className="kicker !text-muted">{c.title}</p>
              <ul className="mt-4 space-y-1">
                {c.links.filter(([href]) => visible(href)).map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="inline-block py-1.5 text-[0.95rem] text-ink-2 hover:text-sea">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="wrap flex flex-col gap-2 py-6 text-sm text-muted sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} DALIL — {t('rights')}
          </span>
          <span>mydalil.com</span>
        </div>
      </div>
    </footer>
  )
}
