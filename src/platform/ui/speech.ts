'use client'

/**
 * Dictée : interface unique pour tout le site. Moteur actuel = reconnaissance vocale du navigateur
 * (gratuite ; Google sur Chrome, Apple sur Safari/iPhone). Emplacement prévu pour un moteur spécialisé plus tard
 * (enregistrement MediaRecorder envoyé à /api/ia/voix), sans changer les champs qui l’utilisent.
 */
export const DICTATION_LANGS = [
  { value: 'fr-FR', label: 'FR' },
  { value: 'ar-DZ', label: 'عربي' },
  { value: 'en-US', label: 'EN' },
] as const
export type DictationLang = (typeof DICTATION_LANGS)[number]['value']

type Result = { isFinal: boolean; 0: { transcript: string } }
type Rec = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: (e: { resultIndex: number; results: ArrayLike<Result> }) => void
  onerror: (e: { error: string }) => void
  onend: () => void
  start: () => void
  stop: () => void
}
const ctor = () => {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export const dictationSupported = () => Boolean(ctor())

const LANG_KEY = 'dalil-dictee-langue'
export function preferredLang(): DictationLang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (DICTATION_LANGS.some((l) => l.value === saved)) return saved as DictationLang
    // Langue choisie dans le menu du site (FR · عربي · EN) : la même pour la carte et la dictée.
    const site = localStorage.getItem('dalil-map-lang')
    if (site === 'ar') return 'ar-DZ'
    if (site === 'en') return 'en-US'
    if (site === 'fr') return 'fr-FR'
  } catch {}
  const doc = typeof document !== 'undefined' ? document.documentElement.lang : ''
  return doc.startsWith('ar') ? 'ar-DZ' : doc.startsWith('en') ? 'en-US' : 'fr-FR'
}
export function rememberLang(l: DictationLang) {
  try {
    localStorage.setItem(LANG_KEY, l)
  } catch {}
}

export type Dictation = { stop: () => void }

/** Démarre une dictée : texte en direct pendant qu’on parle, texte final à l’arrêt. */
export function startDictation(o: { lang: DictationLang; onLive: (text: string) => void; onDone: (text: string) => void; onError: (message: string) => void }): Dictation | null {
  const C = ctor()
  if (!C) {
    o.onError('Dictée indisponible sur ce navigateur : essayez Chrome, Edge ou Safari.')
    return null
  }
  const rec = new C()
  rec.lang = o.lang
  rec.continuous = true
  rec.interimResults = true
  let finals = ''
  let live = ''
  rec.onresult = (e) => {
    live = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finals = `${finals} ${r[0].transcript}`.trim()
      else live = `${live} ${r[0].transcript}`.trim()
    }
    o.onLive(`${finals} ${live}`.trim())
  }
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') o.onError('Micro refusé : autorisez-le dans les réglages du navigateur.')
    else if (e.error !== 'no-speech' && e.error !== 'aborted') o.onError('La dictée s’est interrompue. Réessayez.')
  }
  rec.onend = () => o.onDone(`${finals} ${live}`.trim())
  try {
    rec.start()
  } catch {
    o.onError('Micro indisponible.')
    return null
  }
  return { stop: () => rec.stop() }
}
