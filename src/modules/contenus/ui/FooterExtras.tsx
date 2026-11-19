'use client'

import { langPath, type Lang } from '@/platform/i18n'
import { useLang, usePath } from '@/platform/ui/lang'

const LANGS: [Lang, string][] = [['fr', 'Français'], ['en', 'English'], ['ar', 'العربية']]

/** Langues du pied de page : la même page dans l’autre langue (jamais l’accueil). */
export function FooterLanguages() {
  const lang = useLang()
  const path = usePath()
  return (
    <span className="ft-langs">
      {LANGS.map(([code, label], i) => (
        <span key={code}>
          {i > 0 && ' · '}
          <a href={langPath(code, path)} hrefLang={code} lang={code} aria-current={code === lang ? 'true' : undefined}>
            {label}
          </a>
        </span>
      ))}
    </span>
  )
}

const LABEL: Record<Lang, string> = { fr: 'Canal Telegram', en: 'Telegram channel', ar: 'قناة تيليغرام' }

/** Canal Telegram de DALIL : affiché seulement quand son adresse est connue (`NEXT_PUBLIC_TELEGRAM_CHANNEL_URL`). */
export function TelegramChannel() {
  const lang = useLang()
  const url = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL
  if (!url || !/^https:\/\/t\.me\/[\w+/-]+$/.test(url)) return null
  return (
    <a className="ft-telegram" href={url} target="_blank" rel="noopener noreferrer">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m15 10-4 4 6 6 4-16-18 7 4 2 2 6 3-4" />
      </svg>
      {LABEL[lang]}
    </a>
  )
}
