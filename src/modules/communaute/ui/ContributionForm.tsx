'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { SECTORS, WILAYAS } from '@/platform/referentiel/catalog'
import { SmartText } from '@/platform/ui/SmartText'
import { shrinkImage } from '@/platform/ui/shrink'
import { proofHeaders } from '@/platform/security/proofClient'

const KINDS = ['adresse', 'activite', 'evenement', 'correction', 'ferme', 'temoignage', 'media']
const DATED = ['evenement', 'activite']



export function ContributionForm({ initialSector = '' }: { initialSector?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('Aucune publication automatique : l’équipe DALIL vérifie chaque envoi.')
  const [sector, setSector] = useState(initialSector)
  const categories = useMemo(() => SECTORS.find((s) => s.slug === sector)?.categories ?? [], [sector])
  const [kind, setKind] = useState('')
  const [fiche, setFiche] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [free, setFree] = useState(false)
  // Liens directs : /proposer?type=evenement (page week-end), ?type=ferme ou ?fiche=<lieu> (fiches adresses).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const t = q.get('type')
    if (t && KINDS.includes(t)) setKind(t)
    const f = q.get('fiche')
    if (f) {
      setFiche(f)
      if (!t) setKind('correction')
    }
  }, [])


  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setState('sending')
    setMsg('Envoi sécurisé en cours…')
    try {
      const body = new FormData(form)
      body.delete('photos')
      // Photos réduites dans le navigateur (envoi rapide, métadonnées GPS retirées).
      for (const f of photos) body.append('photos', await shrinkImage(f, 2000), f.name.replace(/\.[^.]+$/, '') + '.jpg')
      const r = await fetch('/api/contributions', { method: 'POST', headers: await proofHeaders(), body })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Envoi impossible.')
      form.reset()
      setSector('')
      setKind('')
      setPhotos([])
      setFree(false)
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
          <select name="contributionType" required value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="" disabled>
              Choisir
            </option>
            <option value="adresse">Une adresse</option>
            <option value="activite">Une activité ou une sortie</option>
            <option value="evenement">Un événement</option>
            <option value="correction">Une information à corriger</option>
            <option value="ferme">Un lieu fermé ou une information obsolète</option>
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
          <select name="wilaya" required defaultValue="">
            <option value="" disabled>
              Choisir
            </option>
            {WILAYAS.map((w) => (
              <option key={w.code}>{w.name}</option>
            ))}
          </select>
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
      {DATED.includes(kind) && (
        <fieldset className="form-grid contribution-dates">
          <legend>Quand et à quel prix ?</legend>
          <label>
            <span>Début *</span>
            <input name="startsAt" type="datetime-local" required />
          </label>
          <label>
            <span>Fin</span>
            <input name="endsAt" type="datetime-local" />
          </label>
          <label className="contribution-check">
            <input name="free" type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} /> Gratuit
          </label>
          {!free && (
            <label>
              <span>Prix à partir de (DA)</span>
              <input name="priceMin" type="number" min={0} inputMode="numeric" />
            </label>
          )}
          <label className="contribution-check">
            <input name="family" type="checkbox" /> Adapté aux enfants
          </label>
        </fieldset>
      )}
      {fiche && <input type="hidden" name="fiche" value={fiche} />}
      <label className="contribution-description">
        <span>Ce que DALIL doit savoir *</span>
        <SmartText multiline sentence name="description" required minLength={20} maxLength={3000} rows={7} placeholder="Décrivez ce que vous avez vu, testé ou souhaitez signaler…" />
      </label>
      <label className="contribution-files">
        <span>Photos du lieu ou de l’événement</span>
        <input name="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 3))} />
        <small>3 photos maximum. Elles restent privées jusqu’à validation par l’équipe.</small>
      </label>
      {photos.length > 0 && (
        <fieldset className="form-grid contribution-license">
          <legend>Droits sur {photos.length > 1 ? 'les photos' : 'la photo'}</legend>
          <label>
            <span>Nom à créditer sous la photo *</span>
            <input name="photoAuthor" required maxLength={120} placeholder="Votre nom ou pseudonyme" />
          </label>
          <label className="contribution-check">
            <input name="licenseOk" type="checkbox" required /> Je certifie être l’auteur {photos.length > 1 ? 'de ces photos' : 'de cette photo'} et j’accepte leur publication sous licence libre CC BY 4.0 (réutilisation possible en citant mon nom).
          </label>
        </fieldset>
      )}
      <label className="contribution-cite">
        <span>Être cité si votre contribution est publiée (facultatif)</span>
        <input name="displayName" maxLength={80} placeholder="Nom ou pseudonyme" />
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
