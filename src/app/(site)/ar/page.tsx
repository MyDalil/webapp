import type { Metadata } from 'next'
import { HomeView } from '../HomeView'

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: 'دليل — دليلك في الجزائر' },
  description: 'دليل، الدليل الموثوق لاكتشاف الجزائر والعيش فيها وإنجاز شؤونك: مساجد، أطباء، حرفيون، نزهات، إجراءات، إعلانات.',
  alternates: { canonical: '/ar', languages: { fr: '/', en: '/en', ar: '/ar', 'x-default': '/' } },
  openGraph: { locale: 'ar_DZ' },
}

export default function HomeAr() {
  return <HomeView lang="ar" />
}
