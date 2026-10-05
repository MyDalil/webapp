import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { FormPage } from '@/components/FormPage'
import type { Locale } from '@/i18n/routing'

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'forms' })
  return { title: t('feedbackTitle'), robots: { index: false } }
}

export default async function Page({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ fiche?: string }> }) {
  const { locale } = await params
  const { fiche } = await searchParams
  setRequestLocale(locale)
  return <FormPage kind="feedback" locale={locale} prefill={fiche?.slice(0, 100)} />
}
