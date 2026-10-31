'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from '@/platform/shell/toast'
import type { Lang } from '@/platform/i18n'

const NEAR = {
  fr: { label: 'Autour de moi', aria: 'résultats les plus proches de ma position', busy: 'Localisation…', noGeo: 'Votre navigateur ne donne pas la position. Écrivez une commune ou un quartier.', denied: 'Position non disponible. Autorisez la localisation, ou écrivez une commune ou un quartier.' },
  en: { label: 'Near me', aria: 'results closest to my location', busy: 'Locating…', noGeo: 'Your browser does not share your location. Type a town or a district.', denied: 'Location unavailable. Allow location access, or type a town or a district.' },
  ar: { label: 'بالقرب مني', aria: 'أقرب النتائج إلى موقعي', busy: 'جارٍ تحديد الموقع…', noGeo: 'متصفحك لا يتيح تحديد الموقع. اكتب اسم بلدية أو حي.', denied: 'تعذّر تحديد الموقع. اسمح بالوصول إلى الموقع، أو اكتب اسم بلدية أو حي.' },
}

/** Position arrondie à ~100 m, jamais enregistrée : elle sert seulement à classer les résultats (paramètre `pos`). */
export function positionParam(lat: number, lng: number) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`
}

/**
 * « Autour de moi » : demande la position au navigateur puis ouvre les résultats les plus proches.
 * Texte cherché : `text` (page de résultats) ou le champ `inputId` lu au clic (accueil). Sans texte : mosquées.
 */
export function NearMe({ text = '', inputId, className = '', label, lang = 'fr' }: { text?: string; inputId?: string; className?: string; label?: string; lang?: Lang }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const go = () => {
    if (!('geolocation' in navigator)) return toast(NEAR[lang].noGeo)
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBusy(false)
        const typed = inputId ? (document.getElementById(inputId) as HTMLInputElement | null)?.value : null
        const q = (typed ?? text).trim() || 'mosquée'
        router.push(`/recherche?q=${encodeURIComponent(q)}&pos=${positionParam(p.coords.latitude, p.coords.longitude)}`)
      },
      () => {
        setBusy(false)
        toast(NEAR[lang].denied)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }
  return (
    <button type="button" className={`near-me ${className}`} onClick={go} disabled={busy} aria-label={`${label ?? NEAR[lang].label} : ${NEAR[lang].aria}`}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        <circle cx="12" cy="12" r="7.5" />
      </svg>
      <span>{busy ? NEAR[lang].busy : (label ?? NEAR[lang].label)}</span>
    </button>
  )
}
