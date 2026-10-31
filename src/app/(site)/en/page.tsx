import type { Metadata } from 'next'
import { HomeView } from '../HomeView'

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: 'DALIL — Guide to Algeria' },
  description: 'DALIL, the trusted guide to explore, live and get things done in Algeria: mosques, doctors, tradespeople, outings, paperwork, classifieds.',
  alternates: { canonical: '/en', languages: { fr: '/', en: '/en', ar: '/ar', 'x-default': '/' } },
  openGraph: { locale: 'en_GB' },
}

export default function HomeEn() {
  return <HomeView lang="en" />
}
