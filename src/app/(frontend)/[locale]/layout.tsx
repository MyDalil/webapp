import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import '@fontsource-variable/fraunces/standard.css'
import '@fontsource-variable/ibm-plex-sans/standard.css'
import '@fontsource-variable/noto-naskh-arabic/index.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css'
import '../globals.css'
import { routing, isRtl, type Locale } from '@/i18n/routing'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydalil.com'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    metadataBase: new URL(SITE),
    title: { default: `${t('siteName')} — ${t('tagline')}`, template: `%s · ${t('siteName')}` },
    description: t('description'),
    applicationName: 'DALIL',
    openGraph: { type: 'website', siteName: 'DALIL', locale: locale === 'ar' ? 'ar_DZ' : locale === 'en' ? 'en_US' : 'fr_FR' },
    twitter: { card: 'summary_large_image' },
    alternates: { languages: { fr: '/', en: '/en', ar: '/ar', 'x-default': '/' } },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f3ec' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1315' },
  ],
}

const themeScript = `(function(){try{var t=localStorage.getItem('dalil-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  return (
    <html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <Header locale={locale as Locale} />
          <main id="contenu">{children}</main>
          <Footer locale={locale as Locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
