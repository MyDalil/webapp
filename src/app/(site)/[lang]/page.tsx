import type { Metadata } from 'next'
import { isLang, langPath, type Lang } from '@/platform/i18n'
import { HomeView } from './HomeView'

export const revalidate = 3600

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  const l: Lang = isLang(lang) ? lang : 'fr'
  return { alternates: { canonical: langPath(l, '/'), languages: { fr: '/', en: '/en', ar: '/ar', 'x-default': '/' } } }
}

export default async function Home({ params }: Props) {
  const { lang } = await params
  return <HomeView lang={isLang(lang) ? lang : 'fr'} />
}
