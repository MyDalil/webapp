'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'

type Guide = { slug: string; title: string; category: string; summary: string; keywords: string[] }
type Result = { labels: string[]; criteria: string[]; questions: string[]; results: Guide[]; regulatedWork: boolean }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const RULES: { pattern: RegExp; slugs: string[]; label: string; questions: string[] }[] = [
  { pattern: /hotel|heberg|excursion|voyage|touris|patrimoine|culture|evenement|sejour/, slugs: ['decouvrir-algerie', 'sorties-en-famille'], label: 'Découvertes et séjours', questions: ['Quelle destination et quelles dates envisagez-vous ?'] },
  { pattern: /banque|budget|compte|argent|paiement/, slugs: ['budget-et-banque'], label: 'Banques et budget', questions: ['Recherchez-vous une information générale ou un service bancaire précis ?'] },
  { pattern: /internet|telecom|forfait|fibre/, slugs: ['internet-et-telecoms'], label: 'Internet et télécoms', questions: ['Dans quelle commune cherchez-vous une offre ? L’éligibilité se vérifie à l’adresse exacte.'] },
  { pattern: /transport|train|taxi|trajet|permis/, slugs: ['transport'], label: 'Déplacements', questions: ['Quel trajet et à quelle date ?'] },
  { pattern: /droit|conseil|demarche|administrat/, slugs: ['documents-et-demarches'], label: 'Démarches et conseil', questions: ['Quelle démarche souhaitez-vous comprendre ?'] },
  { pattern: /ville|wilaya/, slugs: ['choisir-sa-ville'], label: 'Villes et régions', questions: ['Cherchez-vous des lieux à découvrir ou des repères pour y vivre ?'] },
  { pattern: /sortie|parc|jardin|musee|plage|attraction|activite|demain|loisir|promenade/, slugs: ['sorties-en-famille', 'decouvrir-algerie'], label: 'Sorties et découvertes', questions: ['Dans quelle ville ou commune cherchez-vous une sortie ?', 'Pour quel jour, avec quel budget et, si vous êtes en famille, pour quels âges ?'] },
  { pattern: /restaurant|cafe|manger|cuisine|repas|brunch/, slugs: ['restaurants'], label: 'Restaurants et cafés', questions: ['Dans quel quartier, pour combien de personnes et avec quel budget ?', 'Avez-vous des préférences culinaires ou des besoins d’accessibilité ?'] },
  { pattern: /pharmacie|pharmacien|garde/, slugs: ['pharmacies', 'sante'], label: 'Pharmacies et santé', questions: ['Dans quelle commune et pour quel horaire recherchez-vous une pharmacie ? Les gardes doivent être confirmées pour la date exacte.'] },
  { pattern: /massage|masseur|bien.etre|sport|artisan|plomb|repar|service|professionnel/, slugs: ['services-du-quotidien'], label: 'Services du quotidien', questions: ['Quel service précis, dans quelle commune et à quel moment ?'] },
  { pattern: /ecole|scolar|enfant|education|lycee|maternelle|college|formation/, slugs: ['ecole-et-famille', 'choisir-sa-ville'], label: 'École et famille', questions: ['Quel âge ont vos enfants et dans quelle ville souhaitez-vous vivre ?', 'Quel programme scolaire, quelles langues et quel budget recherchez-vous ?'] },
  { pattern: /neurochir|chirurg|medecin|infirmier|pharmacien|dentiste|exercer|diplome/, slugs: ['travail-et-entreprise', 'documents-et-demarches'], label: 'Exercer un métier réglementé', questions: ['Dans quel pays avez-vous obtenu votre diplôme, et quel est votre statut actuel ?', 'Souhaitez-vous un emploi salarié ou exercer à votre compte ?'] },
  { pattern: /travaill|emploi|entrepren|entreprise|invest|revenir|etude/, slugs: ['travail-et-entreprise', 'preparer-son-installation'], label: 'Travail et installation', questions: ['Avez-vous déjà une activité ou un employeur identifié ?', 'Dans quelle région et à quel horizon souhaitez-vous vous installer ?'] },
  { pattern: /logement|location|appartement|maison|quartier/, slugs: ['logement', 'choisir-sa-ville'], label: 'Logement et cadre de vie', questions: ['Quelle ville, quelle surface et quel budget total envisagez-vous ?'] },
  { pattern: /sante|soin|traitement|clinique|hopital|handicap|accessibilite/, slugs: ['sante', 'choisir-sa-ville'], label: 'Accès aux soins', questions: ['Quelle ville et quel type de structure recherchez-vous ? Évitez de partager des données médicales personnelles.'] },
  { pattern: /mosquee|coran|musulm|relig|librairie|omra|umra|hajj|hadj/, slugs: ['vie-musulmane', 'hajj-et-omra'], label: 'Vie musulmane', questions: ['Cherchez-vous un lieu proche de votre futur logement, un enseignement ou un voyage ?'] },
  { pattern: /hijra|install|depart|partir|demena|famille/, slugs: ['preparer-son-installation', 'documents-et-demarches'], label: 'Projet d’installation', questions: ['Partez-vous seul ou en famille, et à quel horizon ?'] },
]

const STOP = ['dans', 'pour', 'avec', 'vous', 'nous', 'cela', 'personne', 'souhaite', 'recherche', 'algerie', 'voudrais', 'comment']

function orient(text: string, guides: Guide[]): Result {
  const n = norm(text).slice(0, 12000)
  const hits = RULES.filter((r) => r.pattern.test(n))
  const slugs = [...new Set(hits.filter((r) => r.label !== 'Villes et régions' || hits.length === 1).flatMap((r) => r.slugs))]
  const words = n.match(/[a-z]{4,}/g)?.filter((w) => !STOP.includes(w)) ?? []
  const results = guides
    .map((g) => {
      const hay = norm([g.title, g.summary, ...g.keywords].join(' '))
      return { g, score: (slugs.includes(g.slug) ? 20 - slugs.indexOf(g.slug) : 0) + Math.min(10, words.filter((w) => hay.includes(w)).length) }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.g)
  const criteria = [/francais|francaise/.test(n) ? 'Français' : '', /anglais|anglaise/.test(n) ? 'Anglais' : '', /arabe/.test(n) ? 'Arabe' : '', /\bia\b|intelligence artificielle/.test(n) ? 'Enseignement de l’IA à confirmer' : ''].filter(Boolean)
  return {
    labels: [...new Set(hits.map((r) => r.label))],
    criteria,
    questions: [...new Set(hits.flatMap((r) => r.questions))].slice(0, 3),
    results,
    regulatedWork: /neurochir|chirurg|medecin|infirmier|pharmacien|dentiste/.test(n),
  }
}

function Icon({ kind }: { kind: 'attach' | 'mic' | 'send' }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === 'attach' ? (
        <path d="m8 13 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7L13 2m-5 11a1 1 0 0 0 2 2l7-7" />
      ) : kind === 'mic' ? (
        <>
          <rect x="9" y="2" width="6" height="13" rx="3" />
          <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
        </>
      ) : (
        <path d="M12 19V5m-6 6 6-6 6 6" />
      )}
    </svg>
  )
}

type SpeechCtor = new () => {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void
  onerror: (e: { error: string }) => void
  onend: () => void
  start: () => void
  stop: () => void
  abort: () => void
}

export function GuidedSearch({ guides, initialQuery = '', compact = false }: { guides: Guide[]; initialQuery?: string; compact?: boolean }) {
  const [query, setQuery] = useState(initialQuery)
  const [file, setFile] = useState<{ name: string; text: string } | null>(null)
  const [status, setStatus] = useState('')
  const [reading, setReading] = useState(false)
  const [listening, setListening] = useState(false)
  const [result, setResult] = useState<Result | null>(() => (initialQuery ? orient(initialQuery, guides) : null))
  const textRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<InstanceType<SpeechCtor> | null>(null)
  const headRef = useRef<HTMLHeadingElement>(null)
  const seq = useRef(0)

  useEffect(() => {
    setQuery(initialQuery)
    setResult(initialQuery ? orient(initialQuery, guides) : null)
  }, [initialQuery, guides])

  useEffect(() => {
    const s = seq
    return () => {
      s.current++
      recRef.current?.abort()
    }
  }, [])

  function dictate() {
    if (listening) {
      recRef.current?.stop()
      return
    }
    const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) {
      setStatus('La dictée n’est pas disponible ici. Utilisez le microphone du clavier de votre téléphone ou écrivez votre demande.')
      return
    }
    const rec = new Ctor()
    recRef.current = rec
    const lang = document.documentElement.lang
    rec.lang = lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-GB' : 'fr-FR'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e) => {
      setQuery((q) => `${q} ${e.results[0][0].transcript}`.trim().slice(0, 4000))
      textRef.current?.focus()
    }
    rec.onerror = (e) => {
      setStatus(e.error === 'not-allowed' ? 'Microphone non autorisé. Vous pouvez écrire votre demande.' : 'La dictée n’a pas abouti. Réessayez ou écrivez votre demande.')
      setListening(false)
    }
    rec.onend = () => setListening(false)
    try {
      rec.start()
      setListening(true)
      setStatus('Dictée en cours. Selon votre navigateur, l’audio est traité par son service vocal. Aucun envoi de votre demande sans votre validation.')
    } catch {
      setStatus('Microphone indisponible. Vous pouvez utiliser le clavier.')
    }
  }

  async function readFile(f?: File) {
    if (!f) return
    const id = ++seq.current
    setStatus('')
    setFile(null)
    if (f.size > 5 * 1024 * 1024) return setStatus('Choisissez un document de moins de 5 Mo.')
    if (!/\.(pdf|txt|md|csv)$/i.test(f.name)) return setStatus('Formats acceptés : PDF avec texte, TXT, MD et CSV.')
    setReading(true)
    try {
      let text = ''
      if (/\.pdf$/i.test(f.name)) {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
        const task = pdfjs.getDocument({ data: new Uint8Array(await f.arrayBuffer()) })
        try {
          const doc = await task.promise
          for (let p = 1; p <= Math.min(doc.numPages, 12) && text.length < 8000; p++) {
            const c = await (await doc.getPage(p)).getTextContent()
            text += c.items.map((i) => ('str' in i ? i.str : '')).join(' ') + '\n'
          }
        } finally {
          await task.destroy()
        }
      } else text = await f.text()
      if (id !== seq.current) return
      if (!text.trim()) throw new Error('Ce document ne contient pas de texte lisible. Pour un scan, copiez les passages utiles dans votre demande.')
      setFile({ name: f.name, text: text.slice(0, 8000) })
      setStatus('Document lu dans cette page : ses premiers passages serviront à trouver les guides utiles. Il n’est ni téléversé ni enregistré.')
    } catch (e) {
      if (id === seq.current) setStatus(e instanceof Error && e.message.startsWith('Ce document') ? e.message : 'Impossible de lire ce document. Essayez un fichier texte ou copiez le passage utile.')
    } finally {
      if (id === seq.current) setReading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!query.trim() && !file) return textRef.current?.focus()
    recRef.current?.stop()
    setResult(orient(`${query}\n${file?.text ?? ''}`, guides))
    setStatus('')
    const url = new URL(window.location.href)
    if (url.pathname === '/recherche') {
      url.searchParams.set('q', query.trim())
      window.history.replaceState(null, '', url)
    }
    setTimeout(() => headRef.current?.focus(), 0)
  }

  const id = compact ? 'home-project-query' : 'project-query'
  return (
    <div className={`guided-search ${compact ? 'guided-search-hero' : ''}`}>
      <form onSubmit={onSubmit} className="orientation-composer">
        <label className="sr-only" htmlFor={id}>
          Décrivez votre recherche
        </label>
        <textarea ref={textRef} id={id} value={query} onChange={(e) => setQuery(e.target.value)} maxLength={4000} rows={2} placeholder="Une sortie en famille demain, un restaurant, une école près de chez moi…" />
        {file && (
          <div className="search-file">
            <span>{file.name}</span>
            <button
              type="button"
              aria-label="Retirer le document"
              onClick={() => {
                seq.current++
                setFile(null)
                setStatus('')
              }}
            >
              ×
            </button>
            <details>
              <summary>Voir le texte retenu</summary>
              <pre>{file.text}</pre>
            </details>
          </div>
        )}
        <div className="composer-toolbar">
          <div>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.csv" hidden onChange={(e) => void readFile(e.target.files?.[0])} />
            <button type="button" className="composer-icon" aria-label="Joindre un document" title="PDF ou fichier texte, 5 Mo maximum" onClick={() => fileRef.current?.click()} disabled={reading}>
              <Icon kind="attach" />
            </button>
            <button type="button" className={`composer-icon ${listening ? 'recording' : ''}`} aria-label={listening ? 'Arrêter la dictée' : 'Dicter ma recherche'} aria-pressed={listening} onClick={dictate}>
              <Icon kind="mic" />
            </button>
          </div>
          <small>{reading ? 'Lecture du document…' : 'Lieux, services, informations et idées'}</small>
          <button className="composer-submit" aria-label="Trouver les informations utiles" type="submit" disabled={reading || (!query.trim() && !file)}>
            <Icon kind="send" />
          </button>
        </div>
      </form>
      <p className="search-status" role="status">
        {status}
      </p>
      {!result && (
        <div className="orientation-examples">
          {['Une sortie en famille demain', 'Un restaurant à Alger', 'Une école pour mes enfants'].map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex)
                textRef.current?.focus()
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
      {result && (
        <section className="orientation-results">
          <h2 ref={headRef} tabIndex={-1}>
            Des repères pour votre recherche
          </h2>
          <p>Une première orientation dans nos guides. Les critères d’un établissement se confirment ensuite auprès de celui-ci.</p>
          {result.criteria.length > 0 && (
            <div className="search-criteria">
              {result.criteria.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          )}
          {result.regulatedWork && <p className="orientation-note">Votre activité est un sujet du guide. Les conditions d’exercice et la reconnaissance de votre diplôme doivent être confirmées auprès des autorités compétentes.</p>}
          <div className="orientation-guide-grid">
            {result.results.map((g) => (
              <Link key={g.slug} href={`/guides/${g.slug}`}>
                <small>{g.category}</small>
                <h3>{g.title}</h3>
                <p>{g.summary}</p>
                <span>Lire le guide →</span>
              </Link>
            ))}
          </div>
          {!result.results.length && (
            <p>
              Nous n’avons pas encore de guide assez précis sur cette demande. <Link href="/guides">Explorer tous les guides</Link> ou <Link href="/proposer">proposer un sujet</Link>.
            </p>
          )}
          {result.questions.length > 0 && (
            <div className="orientation-next">
              <h3>Pour préciser votre recherche</h3>
              <ul>
                {result.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="orientation-actions">
            <Link className="green-button" href="/onboarding">
              Personnaliser mon guide
            </Link>
            <Link href="/boutique?offer=member">Découvrir l’accompagnement membre</Link>
          </div>
          <small className="search-transparency">Cette première orientation rapproche votre demande des guides disponibles. Elle ne constitue pas une sélection d’établissements vérifiés.</small>
        </section>
      )}
    </div>
  )
}
