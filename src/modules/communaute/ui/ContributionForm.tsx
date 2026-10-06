'use client'

import { useMemo, useRef, useState, type FormEvent } from 'react'
import { SECTORS } from '@/platform/referentiel/catalog'

type Rec = { lang: string; continuous: boolean; interimResults: boolean; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void; onerror: () => void; onend: () => void; start: () => void; stop: () => void }

function Mic() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="2" width="6" height="13" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
    </svg>
  )
}

export function ContributionForm({ initialSector = '' }: { initialSector?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('Aucune publication automatique : l’équipe DALIL vérifie chaque envoi.')
  const [sector, setSector] = useState(initialSector)
  const [listening, setListening] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const recRef = useRef<Rec | null>(null)
  const categories = useMemo(() => SECTORS.find((s) => s.slug === sector)?.categories ?? [], [sector])

  function dictate() {
    if (listening) return recRef.current?.stop()
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) {
      setState('error')
      return setMsg('La dictée n’est pas disponible dans ce navigateur. Utilisez le microphone du clavier ou joignez un enregistrement audio.')
    }
    const rec = new Ctor()
    recRef.current = rec
    const lang = document.documentElement.lang
    rec.lang = lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-GB' : 'fr-FR'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e) => {
      if (textRef.current) {
        textRef.current.value = `${textRef.current.value} ${e.results[0][0].transcript}`.trim().slice(0, 3000)
        textRef.current.focus()
      }
    }
    rec.onerror = () => {
      setState('error')
      setMsg('La dictée n’a pas abouti. Réessayez ou écrivez votre message.')
    }
    rec.onend = () => setListening(false)
    try {
      rec.start()
      setListening(true)
      setState('idle')
      setMsg('Je vous écoute… Relisez le texte avant l’envoi.')
    } catch {
      setState('error')
      setMsg('Le microphone est indisponible pour le moment.')
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setState('sending')
    setMsg('Envoi sécurisé en cours…')
    try {
      const r = await fetch('/api/contributions', { method: 'POST', body: new FormData(form) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Envoi impossible.')
      form.reset()
      setSector('')
      setState('success')
      setMsg('Merci. Votre contribution est enregistrée et transmise à l’équipe DALIL pour vérification.')
    } catch (err) {
      setState('error')
      setMsg(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  return (
    <form className="data-form contribution-form" onSubmit={submit} aria-busy={state === 'sending'}>
      <fieldset className="contribution-profile-choice">
        <legend>Vous contribuez en tant que</legend>
        <label>
          <input type="radio" name="submitterType" value="particulier" defaultChecked /> Particulier
        </label>
        <label>
          <input type="radio" name="submitterType" value="professionnel" /> Professionnel
        </label>
      </fieldset>
      <div className="form-grid">
        <label>
          <span>Votre contribution *</span>
          <select name="contributionType" required defaultValue="">
            <option value="" disabled>
              Choisir
            </option>
            <option value="adresse">Une adresse</option>
            <option value="activite">Une activité ou une sortie</option>
            <option value="evenement">Un événement</option>
            <option value="correction">Une information à corriger</option>
            <option value="temoignage">Un témoignage</option>
            <option value="media">Une photo ou une vidéo</option>
          </select>
        </label>
        <label>
          <span>Rubrique</span>
          <select name="sectorSlug" value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">Choisir une rubrique</option>
            {SECTORS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Catégorie</span>
          <select name="category" defaultValue="" key={sector}>
            <option value="">{categories.length ? 'Choisir une catégorie' : 'Choisissez d’abord une rubrique'}</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Nom ou titre *</span>
          <input name="title" required maxLength={180} placeholder="Nom du lieu, de l’activité ou du sujet" />
        </label>
        <label>
          <span>Wilaya *</span>
          <input name="wilaya" required maxLength={80} placeholder="Ex. Alger" />
        </label>
        <label>
          <span>Commune</span>
          <input name="commune" maxLength={100} placeholder="Ex. Hydra" />
        </label>
        <label>
          <span>Contact connu</span>
          <input name="contact" maxLength={180} placeholder="Téléphone ou contact public" />
        </label>
        <label>
          <span>Lien source</span>
          <input name="sourceUrl" type="url" maxLength={500} placeholder="Site officiel ou réseau social" />
        </label>
        <label>
          <span>Votre email *</span>
          <input name="email" type="email" autoComplete="email" required maxLength={180} placeholder="vous@exemple.com" />
        </label>
      </div>
      <label className="contribution-description">
        <span>Ce que DALIL doit savoir *</span>
        <textarea ref={textRef} name="description" required minLength={20} maxLength={3000} rows={7} placeholder="Décrivez ce que vous avez vu, testé ou souhaitez signaler…" />
      </label>
      <button className={`voice-input-button ${listening ? 'is-listening' : ''}`} type="button" onClick={dictate} aria-pressed={listening}>
        <Mic /> {listening ? 'Arrêter la dictée' : 'Dicter mon message'}
      </button>
      <label className="contribution-files">
        <span>Photos, document, audio ou vidéo</span>
        <input name="files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/csv,audio/mpeg,audio/mp4,audio/wav,audio/webm,video/mp4,video/webm" />
        <small>3 fichiers maximum, 12 Mo par fichier. Les pièces restent privées jusqu’à validation.</small>
      </label>
      <label className="honeypot" aria-hidden="true">
        Site web
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="form-submit-row">
        <button className="green-button" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Envoi…' : 'Envoyer à DALIL'}
        </button>
        <small className={state === 'error' ? 'form-error' : state === 'success' ? 'form-success' : ''} aria-live="polite">
          {msg}
        </small>
      </div>
    </form>
  )
}
