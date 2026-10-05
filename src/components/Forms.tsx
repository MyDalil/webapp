'use client'

import { useActionState, useEffect, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight, Check } from 'lucide-react'
import { submit, subscribe, type FormState } from '@/app/(frontend)/actions'

function Guard() {
  const [t, setT] = useState('')
  useEffect(() => setT(String(Date.now())), [])
  return (
    <>
      <input type="hidden" name="_t" value={t} />
      <div aria-hidden="true" className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir
          <input type="text" name="website_hp" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
    </>
  )
}

export function NewsletterForm({ compact }: { compact?: boolean }) {
  const t = useTranslations('forms')
  const locale = useLocale()
  const [state, action, pending] = useActionState<FormState, FormData>(subscribe, null)
  if (state?.ok)
    return (
      <p className="flex items-center gap-2 font-medium text-casbah" role="status">
        <Check className="h-5 w-5" aria-hidden="true" /> {t('newsletterThanks')}
      </p>
    )
  return (
    <form action={action} className="relative">
      <Guard />
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor={compact ? 'nl-f' : 'nl'} className="sr-only">
        {t('email')}
      </label>
      <div className="flex gap-2">
        <input
          id={compact ? 'nl-f' : 'nl'}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t('email')}
          className="field min-w-0 flex-1 !rounded-full"
          aria-invalid={state?.error === 'email' || undefined}
        />
        <button type="submit" className="btn btn-primary shrink-0" disabled={pending}>
          {pending ? t('sending') : t('newsletterCta')}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>
      {state && !state.ok && (
        <p className="mt-2 text-sm text-terra" role="alert">
          {t('error')}
        </p>
      )}
    </form>
  )
}

type Field = { name: string; label: string; type?: string; required?: boolean; textarea?: boolean; placeholder?: string; autoComplete?: string; options?: string[] }

export function SubmissionForm({ kind, fields, intro }: { kind: 'address' | 'pro' | 'correction' | 'feedback'; fields: Field[]; intro?: ReactNode }) {
  const t = useTranslations('forms')
  const locale = useLocale()
  const [state, action, pending] = useActionState<FormState, FormData>(submit, null)
  const [url, setUrl] = useState('')
  useEffect(() => setUrl(document.referrer || location.href), [])
  if (state?.ok)
    return (
      <div className="card flex items-start gap-3 p-6" role="status">
        <Check className="mt-0.5 h-6 w-6 shrink-0 text-casbah" aria-hidden="true" />
        <p className="text-lg">{t('thanks')}</p>
      </div>
    )
  return (
    <form action={action} className="card relative grid gap-5 p-5 md:p-8" noValidate={false}>
      {intro}
      <Guard />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="pageUrl" value={url} />
      {fields.map((f) => (
        <div key={f.name} className="grid gap-1.5">
          <label htmlFor={`f-${f.name}`} className="text-sm font-semibold text-ink">
            {f.label}
            {f.required && <span className="text-terra"> *</span>}
          </label>
          {f.textarea ? (
            <textarea id={`f-${f.name}`} name={f.name} required={f.required} rows={5} placeholder={f.placeholder} className="field" />
          ) : f.options ? (
            <select id={`f-${f.name}`} name={f.name} required={f.required} className="field" defaultValue="">
              <option value="" disabled>
                —
              </option>
              {f.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              id={`f-${f.name}`}
              name={f.name}
              type={f.type ?? 'text'}
              required={f.required}
              placeholder={f.placeholder}
              autoComplete={f.autoComplete}
              className="field"
            />
          )}
        </div>
      ))}
      <p className="text-sm text-muted">{t('privacy')}</p>
      {state && !state.ok && (
        <p className="text-sm font-medium text-terra" role="alert">
          {t('error')}
        </p>
      )}
      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? t('sending') : t('send')}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>
    </form>
  )
}
