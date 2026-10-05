import { getTranslations } from 'next-intl/server'
import { getSectors, getWilayas, tx } from '@/lib/data'
import { PageHero } from './Cards'
import { SubmissionForm } from './Forms'
import type { Locale } from '@/i18n/routing'

export async function FormPage({ kind, locale, prefill }: { kind: 'address' | 'pro' | 'feedback'; locale: Locale; prefill?: string }) {
  const t = await getTranslations('forms')
  const [sectors, wilayas] = await Promise.all([getSectors(), getWilayas()])
  const sectorOpts = sectors.map((s) => tx(s.title as never, locale))
  const wilayaOpts = wilayas.map((w) => `${String(w.code).padStart(2, '0')} · ${tx(w.name as never, locale)}`)
  const title = kind === 'address' ? t('proposeTitle') : kind === 'pro' ? t('proTitle') : t('feedbackTitle')
  const lead = kind === 'address' ? t('proposeLead') : kind === 'pro' ? t('proLead') : t('feedbackLead')
  const fields =
    kind === 'feedback'
      ? [
          { name: 'subject', label: t('message'), required: true, textarea: true, placeholder: prefill ? `Fiche : ${prefill}` : undefined },
          { name: 'email', label: t('email'), type: 'email', autoComplete: 'email' },
        ]
      : [
          { name: 'subject', label: t('placeName'), required: true },
          { name: 'sector', label: t('sector'), options: sectorOpts, required: kind === 'pro' },
          { name: 'wilaya', label: t('wilaya'), options: wilayaOpts },
          { name: 'message', label: t('message'), textarea: true, placeholder: t('messagePlaceholder') },
          { name: 'name', label: t('name'), autoComplete: 'name', required: kind === 'pro' },
          { name: 'email', label: t('email'), type: 'email', autoComplete: 'email', required: kind === 'pro' },
          { name: 'phone', label: t('phone'), type: 'tel', autoComplete: 'tel' },
        ]
  return (
    <>
      <PageHero title={title} lead={lead} />
      <section className="wrap max-w-3xl py-12">
        <SubmissionForm kind={kind === 'feedback' && prefill ? 'correction' : kind} fields={fields} />
      </section>
    </>
  )
}
