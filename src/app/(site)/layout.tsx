import type { Metadata, Viewport } from 'next'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@/styles/legacy.css'
import '@/styles/mockup.css'
import '@/styles/site.css'
import { Header } from '@/components/shell/Header'
import { Assistant } from '@/components/shell/Assistant'
import { LoginDialog } from '@/components/shell/LoginDialog'
import { Toast } from '@/components/shell/Toast'
import { Tree } from '@/components/Tree'
import { SHELL } from '@/content'

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

const themeScript = `(function(){try{var t=localStorage.getItem('dalil-theme');if(t){document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark')}}catch(e){}})()`

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
          <Tree nodes={[SHELL.footer]} />
        </div>
        <Assistant />
        <Toast />
        <LoginDialog />
      </body>
    </html>
  )
}
