import clsx from 'clsx'

/** Étoile à huit branches (khatam) — signature de DALIL. */
export function Khatam({ className, strokeWidth = 1.6 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round">
      <rect x="7.5" y="7.5" width="17" height="17" />
      <rect x="7.5" y="7.5" width="17" height="17" transform="rotate(45 16 16)" />
      <circle cx="16" cy="16" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function Logo({ locale, className }: { locale: string; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <Khatam className="h-7 w-7 text-sea" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.45rem] font-semibold tracking-[0.04em] text-ink">
          {locale === 'ar' ? 'دليل' : 'DALIL'}
        </span>
        <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-muted [lang=ar]:tracking-normal">
          {locale === 'ar' ? 'DALIL · الجزائر' : 'دليل · Algérie'}
        </span>
      </span>
    </span>
  )
}

/** Séparateur de section avec l’étoile au centre. */
export function StarRule({ className }: { className?: string }) {
  return (
    <div className={clsx('flex items-center gap-4 text-line-strong', className)} aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      <Khatam className="h-4 w-4 text-terra" strokeWidth={2} />
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
