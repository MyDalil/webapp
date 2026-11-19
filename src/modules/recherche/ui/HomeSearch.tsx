'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import Link from '@/platform/ui/Link'
import { useLangRouter } from '@/platform/ui/lang'
import { Icon, IconLabel, iconFor, iconTone } from '@/platform/ui/Icon'
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
type Item = { type: string; url: string; title: string; subtitle: string | null; badge: string | null; slot?: string }
/** Titres des groupes de la liste (maquette validée par Rad, 2026-11-19). */
const GROUP: Record<Lang, Record<string, string>> = {
  fr: { praticien: 'Rendez-vous en ligne', adresse: 'Adresses', prestataire: 'Prestataires', annonce: 'Annonces', demarche: 'Démarches', consulat: 'Ambassades et consulats', guide: 'Guides' },
  en: { praticien: 'Book online', adresse: 'Places', prestataire: 'Providers', annonce: 'Ads', demarche: 'Procedures', consulat: 'Embassies and consulates', guide: 'Guides' },
  ar: { praticien: 'حجز موعد عبر الإنترنت', adresse: 'عناوين', prestataire: 'مقدّمو خدمات', annonce: 'إعلانات', demarche: 'إجراءات', consulat: 'سفارات وقنصليات', guide: 'أدلة' },
}
const IN: Record<Lang, (p: string) => string> = { fr: (p) => `à ${p}`, en: (p) => `in ${p}`, ar: (p) => `في ${p}` }
/** Pictogramme par défaut quand le libellé n’en suggère aucun. */
const TYPE_ICON: Record<string, string> = { praticien: 'health', adresse: 'pin', prestataire: 'wrench', annonce: 'tag', demarche: 'file', consulat: 'globe', guide: 'book', categorie: 'grid', rubrique: 'grid' }
/** Pictogrammes de la maquette validée (santé) ; sinon le pictogramme habituel du libellé. */
const SUGGEST_ICON: [RegExp, string][] = [[/hôpita|chu\b|ehs\b/i, 'hospital'], [/pharmac/i, 'pill'], [/pédiat/i, 'stroller'], [/médecin|docteur|généraliste|cabinet médical/i, 'stethoscope']]
const pick = (label: string, fallback: string) => SUGGEST_ICON.find(([r]) => r.test(label))?.[1] ?? iconFor(label, fallback)
const TIME: Record<Lang, { today: string; tomorrow: string; locale: string }> = { fr: { today: 'Aujourd’hui', tomorrow: 'Demain', locale: 'fr-FR' }, en: { today: 'Today', tomorrow: 'Tomorrow', locale: 'en-GB' }, ar: { today: 'اليوم', tomorrow: 'غدًا', locale: 'ar-DZ' } }
/** Créneau lisible à l’heure d’Alger : « Aujourd’hui 17 h », « Demain 9 h 30 », « lun. 24 nov. 10 h ». */
function slotLabel(iso: string, lang: Lang): string {
  const tz = 'Africa/Algiers'
  const t = TIME[lang]
  const d = new Date(iso)
  const day = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: tz })
  const now = new Date()
  const hm = d.toLocaleTimeString(t.locale, { timeZone: tz, hour: 'numeric', minute: '2-digit' })
  const h = lang === 'fr' ? hm.replace(/^(\d+):(\d+)$/, (_, a, b) => (b === '00' ? `${a} h` : `${a} h ${b}`)) : hm
  if (day(d) === day(now)) return `${t.today} ${h}`
  if (day(d) === day(new Date(now.getTime() + 864e5))) return `${t.tomorrow} ${h}`
  return `${d.toLocaleDateString(t.locale, { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' })} ${h}`
}
const isChip = (it: Item) => it.type === 'categorie' || it.type === 'rubrique'
const initials = (name: string) => name.replace(/^(dr|pr)\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

const UI = {
  fr: { label: 'Que recherchez-vous ?', long: 'Un lieu, une démarche, une activité…', short: 'Que cherchez-vous ?', mic: 'Recherche vocale', stop: 'Arrêter la dictée', search: 'Rechercher', list: 'Propositions', all: (q: string) => `Voir tous les résultats pour « ${q} »`, allIn: (p: string) => `Voir tous les résultats à ${p}`, ex: 'Par exemple :' },
  en: { label: 'What are you looking for?', long: 'A place, a procedure, an activity…', short: 'What are you looking for?', mic: 'Voice search', stop: 'Stop dictation', search: 'Search', list: 'Suggestions', all: (q: string) => `See all results for “${q}”`, allIn: (p: string) => `See all results in ${p}`, ex: 'For example:' },
  ar: { label: 'عمّ تبحث؟', long: 'مكان، إجراء، نشاط…', short: 'عمّ تبحث؟', mic: 'البحث الصوتي', stop: 'إيقاف الإملاء', search: 'بحث', list: 'اقتراحات', all: (q: string) => `عرض كل النتائج لـ «${q}»`, allIn: (p: string) => `عرض كل النتائج في ${p}`, ex: 'مثلًا:' },
}

/** Exemples : jamais deux de la même rubrique à la suite (Rad, 2026-10-31). */
const SUGGESTIONS: [href: string, fr: string, en: string, ar: string, icon: string][] = [
  ['/praticiens?specialite=dentiste&wilaya=16', 'Dentiste à Alger', 'Dentist in Algiers', 'طبيب أسنان في العاصمة', 'health'],
  ['/services/bricolage?activite=electricite', 'Électricien', 'Electrician', 'كهربائي', 'bolt'],
  ['/annuaire/mosquees-priere?category=Mosqu%C3%A9es', 'Mosquée', 'Mosque', 'مسجد', 'mosque'],
  ['/guides/documents-et-demarches', 'Passeport et papiers', 'Passport & papers', 'جواز السفر والوثائق', 'passport'],
  ['/praticiens?specialite=pediatrie', 'Pédiatre', 'Paediatrician', 'طبيب أطفال', 'baby'],
  ['/annonces/immobilier?type=appartement&transaction=location', 'Location d’appartement', 'Flat to rent', 'شقة للكراء', 'home'],
  ['/services/bricolage?activite=plomberie', 'Plombier', 'Plumber', 'سبّاك', 'drop'],
  ['/annuaire/sante-soins?category=Pharmacies', 'Pharmacie', 'Pharmacy', 'صيدلية', 'health'],
]

/** Barre de recherche du hero de la maquette, reliée à la recherche guidée du prototype. */
export function HomeSearch({ lang = 'fr', idBase = 'home-search', autoFocus = false }: { lang?: Lang; idBase?: string; autoFocus?: boolean } = {}) {
  const u = UI[lang]
  const router = useLangRouter()
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
  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])
  const dictation = useRef<Dictation | null>(null)
  const [listening, setListening] = useState(false)
  // Propositions pendant la frappe (index de recherche) : clavier ↑ ↓ Entrée, Échap pour fermer.
  const [text, setText] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [where, setWhere] = useState<string | null>(null)
  const [active, setActive] = useState(-1)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const q = text.trim()
    if (q.length < 2) return
    const ctl = new AbortController()
    const t = setTimeout(() => {
      const w = readWilaya()
      fetch(`/api/recherche?q=${encodeURIComponent(q)}${w ? `&w=${w.code}` : ''}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => {
          setItems(d.items ?? [])
          setWhere(d.place ?? null)
          setActive(-1)
          setOpen(true)
          // Téléphone : la barre remonte en haut de l’écran, la liste occupe la place libre.
          if (window.matchMedia('(max-width: 600px)').matches) ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
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
    if (listening) {
      setListening(false)
      return dictation.current?.stop()
    }
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
      <label className="sr-only" htmlFor={idBase}>
        {u.label}
      </label>
      <input id={idBase} ref={ref} name="search" autoComplete="off" role="combobox" aria-expanded={shown.length > 0} aria-controls={`${idBase}-list`} aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${idBase}-${active}` : undefined} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={() => setTimeout(() => setOpen(false), 150)} onFocus={() => setOpen(true)} placeholder={short ? u.short : u.long} />
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
      <div id={`${idBase}-list`} className="search-suggest" role="listbox" aria-label={u.list}>
        {shown.some(isChip) && (
          <div className="ss-chips">
            {shown.map((it, i) => {
              if (!isChip(it)) return null
              const icon = pick(`${it.title} ${it.subtitle ?? ''}`, TYPE_ICON[it.type])
              return (
                <Link key={it.url} id={`${idBase}-${i}`} role="option" aria-selected={i === active} href={it.url} className={`ss-chip${i === active ? ' is-active' : ''}`}>
                  <span className="ss-chip-ico" style={{ ['--ic' as string]: iconTone(icon) }} aria-hidden="true">
                    <Icon name={icon} />
                  </span>
                  {where && i === 0 ? `${it.title} ${IN[lang](where)}` : it.title}
                </Link>
              )
            })}
          </div>
        )}
        {shown.map((it, i) => {
          if (isChip(it)) return null
          const icon = pick(`${it.subtitle ?? ''} ${it.title}`, TYPE_ICON[it.type] ?? 'pin')
          const head = i === 0 || isChip(shown[i - 1]) || shown[i - 1].type !== it.type
          return (
            <div key={it.url}>
              {head && <p className="ss-group">{GROUP[lang][it.type] ?? ''}</p>}
              <Link id={`${idBase}-${i}`} role="option" aria-selected={i === active} href={it.url} className={`ss-row${i === active ? ' is-active' : ''}`}>
                {it.type === 'praticien' ? (
                  <span className="ss-thumb ss-avatar" style={{ ['--ic' as string]: iconTone(icon) }} aria-hidden="true">{initials(it.title)}</span>
                ) : (
                  <span className="ss-thumb" style={{ ['--ic' as string]: iconTone(icon) }} aria-hidden="true">
                    <Icon name={icon} />
                  </span>
                )}
                <span className="ss-text">
                  <b>{it.title}</b>
                  {it.subtitle && <small>{it.subtitle}</small>}
                </span>
                {it.slot ? <span className="ss-badge">{slotLabel(it.slot, lang)}</span> : it.badge && <span className={`ss-badge${/vérifi|label|rendez-vous|exemple/i.test(it.badge) ? '' : ' is-neutral'}`}>{it.badge}</span>}
              </Link>
            </div>
          )
        })}
        <Link href={`/recherche?q=${encodeURIComponent(text.trim())}`} className="ss-all">
          {where ? `${u.allIn(where)}` : u.all(text.trim())}
          <Icon name="arrow" />
        </Link>
      </div>
    )}
    </div>
    <p className="xp-suggest">
      <NearMe inputId={idBase} className="near-me-home" lang={lang} />
      <span className="sr-only">{u.ex}</span>
      {SUGGESTIONS.map(([href, fr, en, ar, icon]) => (
        <Link key={href} href={href}>
          <IconLabel label={{ fr, en, ar }[lang]} icon={icon} />
        </Link>
      ))}
    </p>
    </>
  )
}
