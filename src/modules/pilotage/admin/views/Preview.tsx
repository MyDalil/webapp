'use client'
import { useState } from 'react'

/** Aperçu de la fiche telle que le public la verra (brouillon compris), en français, arabe ou anglais. */
export function LangPreview({ slug, labels }: { slug: string; labels: Record<string, string> }) {
  const [lang, setLang] = useState<'fr' | 'ar' | 'en'>('fr')
  const src = `/api/preview?slug=${encodeURIComponent(slug)}${lang === 'fr' ? '' : `&lang=${lang}`}`
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="dl-row dl-sb dl-wr">
        <div className="dl-seg" role="radiogroup" aria-label={labels.lang}>
          {(['fr', 'ar', 'en'] as const).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={lang === l} onClick={() => setLang(l)}>{labels[l]}</button>
          ))}
        </div>
        <a className="dl-btn" href={src} target="_blank" rel="noreferrer">{labels.open}</a>
      </div>
      <iframe key={lang} src={src} title={`${labels.title} — ${labels[lang]}`} className="dl-frame" loading="lazy" />
    </div>
  )
}
