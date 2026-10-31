import type { Metadata } from 'next'
import { HomeView } from './HomeView'

export const revalidate = 3600

export const metadata: Metadata = {
  alternates: { canonical: '/', languages: { fr: '/', en: '/en', ar: '/ar', 'x-default': '/' } },
}

export default function Home() {
  return <HomeView lang="fr" />
}
