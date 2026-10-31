import type { Metadata, Viewport } from 'next'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-700.css'
import '@/styles/legacy.css'
import '@/styles/mockup.css'
import '@/styles/site.css'
import '@/styles/experience.css'
import '@/styles/sante.css'
import '@/styles/services.css'
import '@/styles/annonces.css'
import '@/styles/smart-text.css'
import '@/styles/nav.css'
import '@/styles/polish.css'
import '@/styles/fiche.css'
import '@/styles/scale.css'
import '@/styles/recherche.css'
import '@/styles/epure.css'
import { Header } from '@/platform/shell/Header'
import { Assistant } from '@/modules/recherche/ui'
import { LoginDialog } from '@/platform/shell/LoginDialog'
import { Toast } from '@/platform/shell/Toast'
import { Motion } from '@/platform/ui/Motion'
import { JoinCircle } from '@/platform/shell/JoinCircle'
import { Tree } from '@/modules/contenus/ui'
import { footerFor } from '@/modules/contenus'
import { notFound } from 'next/navigation'
import { isLang, LANGS_ALL, type Lang } from '@/platform/i18n'
import { LangProvider } from '@/platform/ui/lang'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydalil.com'

const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'DALIL — Guide de l’Algérie', template: '%s · DALIL' },
  description: 'DALIL, le guide de confiance pour explorer, vivre et avancer en Algérie.',
  applicationName: 'DALIL',
  icons: { icon: '/favicon.svg' },
  openGraph: { type: 'website', siteName: 'DALIL', locale: 'fr_FR', images: ['/og.png'] },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#07140f' },
  ],
}

const themeScript = `(function(){try{var t=localStorage.getItem('dalil-theme');if(t){document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark')}}catch(e){}})()`

export function generateStaticParams() {
  return LANGS_ALL.map((lang) => ({ lang }))
}

const META: Record<Lang, { title: string; template: string; description: string; locale: string }> = {
  fr: { title: 'DALIL — Guide de l’Algérie', template: '%s · DALIL', description: 'DALIL, le guide de confiance pour explorer, vivre et avancer en Algérie.', locale: 'fr_FR' },
  en: { title: 'DALIL — Guide to Algeria', template: '%s · DALIL', description: 'DALIL, the trusted guide to explore, live and get things done in Algeria.', locale: 'en_GB' },
  ar: { title: 'دليل — دليلك في الجزائر', template: '%s · دليل', description: 'دليل، الدليل الموثوق لاكتشاف الجزائر والعيش فيها وإنجاز شؤونك.', locale: 'ar_DZ' },
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const m = META[isLang(lang) ? lang : 'fr']
  return { ...metadata, title: { default: m.title, template: m.template }, description: m.description, openGraph: { ...metadata.openGraph, locale: m.locale } }
}

/** Racine du site, une par langue : /…, /en/…, /ar/… (le français est servi à la racine par réécriture vers /fr/…). */
export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : undefined} data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <LangProvider lang={lang}>
          <a className="skip-link" href="#app">
            {{ fr: 'Aller au contenu', en: 'Skip to content', ar: 'انتقل إلى المحتوى' }[lang]}
          </a>
          <Header />
          <main id="app" tabIndex={-1}>
            {children}
          </main>
          <div className="legacy site-footer-wrap">
            <Tree nodes={[footerFor(lang)]} />
          </div>
          <Assistant />
          <Toast />
          <Motion />
          <JoinCircle />
          <LoginDialog />
        </LangProvider>
      </body>
    </html>
  )
}
