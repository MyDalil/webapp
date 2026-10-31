'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/platform/ui/Icon'
import { NearMe } from './NearMe'
import { readWilaya } from '@/platform/shell/wilaya'
import { toast } from '@/platform/shell/toast'
import { simpleClean } from '@/platform/ai/clean'
import { preferredLang, startDictation, type Dictation } from '@/platform/ui/speech'
import type { Lang } from '@/platform/i18n'

/**
 * Suggestions sous la barre (validées par Rad, 2026-10-21) : hors tourisme d’abord, selon les recherches
 * des Algériens (santé, artisans, papiers). Chaque lien ouvre directement le bon résultat.
 */
type Item = { type: string; url: string; title: string; subtitle: string | null; badge: string | null }
const KIND: Record<Lang, Record<string, string>> = {
  fr: { rubrique: 'Rubrique', categorie: 'Catégorie', adresse: 'Adresse', praticien: 'Praticien', prestataire: 'Prestataire', annonce: 'Annonce', guide: 'Guide' },
  en: { rubrique: 'Section', categorie: 'Category', adresse: 'Address', praticien: 'Practitioner', prestataire: 'Provider', annonce: 'Ad', guide: 'Guide' },
  ar: { rubrique: 'قسم', categorie: 'فئة', adresse: 'عنوان', praticien: 'ممارس', prestataire: 'مقدّم خدمة', annonce: 'إعلان', guide: 'دليل' },
}

const UI = {
  fr: { label: 'Que recherchez-vous ?', long: 'Un lieu, une démarche, une activité…', short: 'Que cherchez-vous ?', mic: 'Recherche vocale', stop: 'Arrêter la dictée', search: 'Rechercher', list: 'Propositions', all: (q: string) => `Voir tous les résultats pour « ${q} »`, ex: 'Par exemple :' },
  en: { label: 'What are you looking for?', long: 'A place, a procedure, an activity…', short: 'What are you looking for?', mic: 'Voice search', stop: 'Stop dictation', search: 'Search', list: 'Suggestions', all: (q: string) => `See all results for “${q}”`, ex: 'For example:' },
  ar: { label: 'عمّ تبحث؟', long: 'مكان، إجراء، نشاط…', short: 'عمّ تبحث؟', mic: 'البحث الصوتي', stop: 'إيقاف الإملاء', search: 'بحث', list: 'اقتراحات', all: (q: string) => `عرض كل النتائج لـ «${q}»`, ex: 'مثلًا:' },
}

/** Exemples : jamais deux de la même rubrique à la suite (Rad, 2026-10-31). */
const SUGGESTIONS: [href: string, fr: string, en: string, ar: string][] = [
  ['/praticiens?specialite=dentiste&wilaya=16', 'Dentiste à Alger', 'Dentist in Algiers', 'طبيب أسنان في العاصمة'],
  ['/services/bricolage?activite=electricite', 'Électricien', 'Electrician', 'كهربائي'],
  ['/annuaire/mosquees-priere?category=Mosqu%C3%A9es', 'Mosquée', 'Mosque', 'مسجد'],
  ['/guides/documents-et-demarches', 'Passeport et papiers', 'Passport & papers', 'جواز السفر والوثائق'],
  ['/praticiens?specialite=pediatrie', 'Pédiatre', 'Paediatrician', 'طبيب أطفال'],
  ['/annonces/immobilier?type=appartement&transaction=location', 'Location d’appartement', 'Flat to rent', 'شقة للكراء'],
  ['/services/bricolage?activite=plomberie', 'Plombier', 'Plumber', 'سبّاك'],
  ['/annuaire/sante-soins?category=Pharmacies', 'Pharmacie', 'Pharmacy', 'صيدلية'],
]

/** Barre de recherche du hero de la maquette, reliée à la recherche guidée du prototype. */
export function HomeSearch({ lang = 'fr' }: { lang?: Lang } = {}) {
  const u = UI[lang]
  const router = useRouter()
  // Téléphone : texte d’exemple court, jamais coupé.
  const [short, setShort] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)')
    const on = () => setShort(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const ref = useRef<HTMLInputElement>(null)
  const dictation = useRef<Dictation | null>(null)
  const [listening, setListening] = useState(false)
  // Propositions pendant la frappe (index de recherche) : clavier ↑ ↓ Entrée, Échap pour fermer.
  const [text, setText] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [active, setActive] = useState(-1)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const q = text.trim()
    if (q.length < 2) return
    const ctl = new AbortController()
    const t = setTimeout(() => {
      fetch(`/api/recherche?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => {
          setItems(d.items ?? [])
          setActive(-1)
          setOpen(true)
        })
        .catch(() => {})
    }, 160)
    return () => {
      clearTimeout(t)
      ctl.abort()
    }
  }, [text])
  const shown = open && text.trim().length >= 2 ? items : []
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!shown.length) return
    if (e.key === 'ArrowDown') (e.preventDefault(), setActive((i) => (i + 1) % shown.length))
    else if (e.key === 'ArrowUp') (e.preventDefault(), setActive((i) => (i <= 0 ? shown.length - 1 : i - 1)))
    else if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'Enter' && active >= 0) (e.preventDefault(), router.push(shown[active].url))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    dictation.current?.stop()
    const q = ref.current?.value.trim()
    // Wilaya choisie dans l’en-tête : ses adresses passent devant quand la recherche ne nomme aucun lieu.
    const w = readWilaya()
    router.push(q ? `/recherche?q=${encodeURIComponent(q)}${w ? `&w=${w.code}` : ''}` : '/recherche')
  }

  // Micro : dictée en direct dans le champ, nettoyée à la fin.
  function mic() {
    if (listening) return dictation.current?.stop()
    const input = ref.current
    if (!input) return
    const base = input.value.trim()
    dictation.current = startDictation({
      lang: preferredLang(),
      onLive: (t) => (input.value = [base, t].filter(Boolean).join(' ')),
      onError: (m) => toast(m),
      onDone: (t) => {
        setListening(false)
        dictation.current = null
        input.value = [base, t ? simpleClean(t) : ''].filter(Boolean).join(' ')
        setText(input.value)
        input.focus()
      },
    })
    if (dictation.current) setListening(true)
  }

  return (
    <>
    <div className="search-wrap">
    <form className="search-bar" onSubmit={submit}>
      <span>
        <Icon name="search" />
      </span>
      <label className="sr-only" htmlFor="home-search">
        {u.label}
      </label>
      <input id="home-search" ref={ref} name="search" autoComplete="off" role="combobox" aria-expanded={shown.length > 0} aria-controls="home-search-list" aria-autocomplete="list" aria-activedescendant={active >= 0 ? `home-search-${active}` : undefined} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={() => setTimeout(() => setOpen(false), 150)} onFocus={() => setOpen(true)} placeholder={short ? u.short : u.long} />
      <button type="button" className={`search-mic ${listening ? 'recording' : ''}`} aria-pressed={listening} aria-label={listening ? u.stop : u.mic} onClick={mic}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
        </svg>
      </button>
      <button className="button primary search-go" type="submit" aria-label={u.search}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
    {shown.length > 0 && (
      <ul id="home-search-list" className="search-suggest" role="listbox" aria-label={u.list}>
        {shown.map((it, i) => (
          <li key={it.url} id={`home-search-${i}`} role="option" aria-selected={i === active}>
            <Link href={it.url} className={i === active ? 'is-active' : undefined}>
              <span className="search-suggest-kind">{KIND[lang][it.type] ?? ''}</span>
              <b>{it.title}</b>
              {it.subtitle && <small>{it.subtitle}</small>}
            </Link>
          </li>
        ))}
        <li role="option" aria-selected={false}>
          <Link href={`/recherche?q=${encodeURIComponent(text.trim())}`} className="search-suggest-all">
            {u.all(text.trim())}
          </Link>
        </li>
      </ul>
    )}
    </div>
    <p className="xp-suggest">
      <NearMe inputId="home-search" className="near-me-home" lang={lang} />
      <span className="sr-only">{u.ex}</span>
      {SUGGESTIONS.map(([href, fr, en, ar]) => (
        <Link key={href} href={href}>
          {{ fr, en, ar }[lang]}
        </Link>
      ))}
    </p>
    </>
  )
}
