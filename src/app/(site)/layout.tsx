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
import { SHELL, footerFor } from '@/modules/contenus'
import { ByLang } from '@/platform/ui/ByLang'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydalil.com'

export const metadata: Metadata = {
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

const themeScript = `(function(){try{var p=location.pathname,h=document.documentElement;if(p==='/ar'||p.indexOf('/ar/')===0){h.lang='ar';h.dir='rtl'}else if(p==='/en'||p.indexOf('/en/')===0){h.lang='en'}}catch(e){}try{var t=localStorage.getItem('dalil-theme');if(t){document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark')}}catch(e){}})()`

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#app">
          Aller au contenu
        </a>
        <Header />
        <main id="app" tabIndex={-1}>
          {children}
        </main>
        <div className="legacy site-footer-wrap">
          <ByLang fr={<Tree nodes={[SHELL.footer]} />} en={<Tree nodes={[footerFor('en')]} />} ar={<Tree nodes={[footerFor('ar')]} />} />
        </div>
        <Assistant />
        <Toast />
        <Motion />
        <JoinCircle />
        <LoginDialog />
      </body>
    </html>
  )
}
