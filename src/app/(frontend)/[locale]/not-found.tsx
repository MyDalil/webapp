import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Khatam } from '@/components/Brand'

export default async function NotFound() {
  const t = await getTranslations('common')
  return (
    <section className="wrap grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <Khatam className="mx-auto h-16 w-16 text-terra" />
        <h1 className="mt-6 text-4xl">{t('notFound')}</h1>
        <p className="mt-3 text-ink-2">{t('notFoundText')}</p>
        <Link href="/" className="btn btn-primary mt-8">
          {t('backHome')}
        </Link>
      </div>
    </section>
  )
}
