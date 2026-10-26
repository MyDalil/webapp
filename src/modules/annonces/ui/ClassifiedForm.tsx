'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { shrinkImage } from '@/platform/ui/shrink'
import { SmartText } from '@/platform/ui/SmartText'
import { CATEGORIES, CONDITIONS, CONTRACTS, DEALS, FUELS, GEARBOXES, PRICE_MODES, RULES, category } from '../referentiel'

type Values = Record<string, string | number | boolean | null | undefined>
export type FormInitial = { id: number; values: Values; photos: { id: number; thumb: string }[] }

/**
 * Dépôt et modification d’une annonce. Les caractéristiques suivent la catégorie choisie.
 * Photos réduites dans le navigateur. Description avec dictée (champ commun SmartText).
 */
export function ClassifiedForm({ wilayas, initial, defaultCategory }: { wilayas: { code: number; name: string }[]; initial?: FormInitial; defaultCategory?: string }) {
  const router = useRouter()
  const v = initial?.values ?? {}
  const [cat, setCat] = useState(String(v.category ?? defaultCategory ?? ''))
  const [priceMode, setPriceMode] = useState(String(v.priceMode ?? 'fixed'))
  const [wilaya, setWilaya] = useState(String(v.wilaya ?? ''))
  const [communes, setCommunes] = useState<{ id: string; name: string }[]>([])
  const [description, setDescription] = useState(String(v.description ?? ''))
  const [kept, setKept] = useState(initial?.photos ?? [])
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const picker = useRef<HTMLInputElement>(null)
  const current = category(cat)
  const has = (a: string) => !!current && (current.attrs as readonly string[]).includes(a)
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  useEffect(() => {
    if (!wilaya) return setCommunes([])
    fetch(`/api/communes?wilaya=${wilaya}`)
      .then((r) => r.json())
      .then((d) => setCommunes(d.communes ?? []))
      .catch(() => setCommunes([]))
  }, [wilaya])

  const room = RULES.maxPhotos - kept.length - files.length
  const addFiles = (list: FileList | null) => {
    if (!list) return
    setFiles((cur) => [...cur, ...Array.from(list).slice(0, Math.max(0, RULES.maxPhotos - kept.length - cur.length))])
    if (picker.current) picker.current.value = ''
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const form = new FormData(e.currentTarget)
    form.set('description', description)
    form.delete('photos')
    for (const p of kept) form.append('keep', String(p.id))
    for (const f of files) form.append('photos', await shrinkImage(f, 1600), 'photo.jpg')
    const r = await fetch(initial ? `/api/annonces/${initial.id}` : '/api/annonces', { method: initial ? 'PUT' : 'POST', body: form })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) return setError(d.error ?? 'Enregistrement impossible. Réessayez.')
    router.push('/mon-compte?annonce=envoyee#annonces')
  }

  const sel = (name: string, list: readonly { value: string; label: string }[], label: string, required = false) => (
    <label>
      {label}
      <select name={name} required={required} defaultValue={String(v[name] ?? '')}>
        <option value="">{required ? 'Choisir…' : 'Non précisé'}</option>
        {list.map((x) => (
          <option key={x.value} value={x.value}>
            {x.label}
          </option>
        ))}
      </select>
    </label>
  )
  const num = (name: string, label: string, opts: { min?: number; max?: number; hint?: string } = {}) => (
    <label>
      {label}
      <input name={name} type="number" inputMode="numeric" min={opts.min ?? 0} max={opts.max} defaultValue={v[name] == null ? '' : String(v[name])} />
      {opts.hint && <small>{opts.hint}</small>}
    </label>
  )

  return (
    <form className="auth-form pro-form classified-form" onSubmit={submit}>
      <div className="auth-row">
        <label>
          Catégorie
          <select name="category" required value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="" disabled>
              Choisir…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        {current && (
          <label>
            Type
            <select key={cat} name="subcategory" required defaultValue={String(v.subcategory ?? '').split(':')[1] ?? ''}>
              <option value="" disabled>
                Choisir…
              </option>
              {current.subs.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <label>
        Titre
        <input name="title" required minLength={5} maxLength={RULES.titleMax} defaultValue={String(v.title ?? '')} placeholder={cat === 'emploi' ? 'Ex. Vendeur en boutique, Oran centre' : cat === 'vehicules' ? 'Ex. Renault Symbol 2019, 85 000 km' : cat === 'immobilier' ? 'Ex. F3 lumineux près du tramway' : 'Ex. Réfrigérateur Condor, très bon état'} />
      </label>

      {current && (
        <>
          {has('deal') && (
            <div className="auth-row">
              {sel('deal', DEALS, 'Transaction', true)}
              {num('rooms', 'Pièces (F…)', { min: 1, max: 20 })}
              {num('surface', 'Surface (m²)', { min: 1 })}
            </div>
          )}
          {has('furnished') && (
            <label className="auth-check">
              <input type="checkbox" name="furnished" defaultChecked={v.furnished === true} /> Meublé
            </label>
          )}
          {has('contract') && (
            <div className="auth-row">
              {sel('contract', CONTRACTS, 'Contrat')}
              <label>
                Secteur d’activité
                <input name="sector" maxLength={80} defaultValue={String(v.sector ?? '')} placeholder="Ex. Commerce, BTP, santé" />
              </label>
            </div>
          )}
          {has('brand') && (
            <div className="auth-row">
              <label>
                Marque
                <input name="brand" maxLength={40} defaultValue={String(v.brand ?? '')} />
              </label>
              <label>
                Modèle
                <input name="model" maxLength={60} defaultValue={String(v.model ?? '')} />
              </label>
              {num('year', 'Année', { min: 1950, max: new Date().getFullYear() + 1 })}
              {num('mileage', 'Kilométrage')}
            </div>
          )}
          {(has('fuel') || has('condition')) && (
            <div className="auth-row">
              {has('fuel') && sel('fuel', FUELS, 'Énergie')}
              {has('gearbox') && sel('gearbox', GEARBOXES, 'Boîte')}
              {has('condition') && sel('condition', CONDITIONS, 'État')}
            </div>
          )}
        </>
      )}

      <label>
        Description
        <SmartText multiline value={description} onChange={setDescription} maxLength={RULES.descriptionMax} rows={6} ariaLabel="Description" placeholder="Décrivez clairement : état, conditions, disponibilité. Pas de numéro ici : les personnes intéressées vous écrivent dans DALIL." />
      </label>

      <div className="auth-row">
        <label>
          {current?.priceLabel ?? 'Prix'} (DA)
          <input name="price" type="number" inputMode="numeric" min={0} defaultValue={v.price == null ? '' : String(v.price)} disabled={priceMode === 'free' || priceMode === 'on-request'} />
        </label>
        <label>
          Prix
          <select name="priceMode" value={priceMode} onChange={(e) => setPriceMode(e.target.value)}>
            {PRICE_MODES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="auth-row">
        <label>
          Wilaya
          <select name="wilaya" required value={wilaya} onChange={(e) => setWilaya(e.target.value)}>
            <option value="" disabled>
              Choisir…
            </option>
            {wilayas.map((w) => (
              <option key={w.code} value={String(w.code)}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Commune
          <select key={wilaya} name="commune" defaultValue={String(v.commune ?? '')} disabled={!communes.length}>
            <option value="">Non précisée</option>
            {communes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="classified-photos">
        <p>
          <b>Photos</b> — {RULES.maxPhotos} au plus. La première sert de couverture.
        </p>
        <div className="review-photos">
          {kept.map((p) => (
            <button key={p.id} type="button" className="review-thumb" style={{ backgroundImage: `url(${p.thumb})` }} aria-label="Retirer la photo" onClick={() => setKept((k) => k.filter((x) => x.id !== p.id))}>
              ×
            </button>
          ))}
          {previews.map((u, i) => (
            <button key={u} type="button" className="review-thumb" style={{ backgroundImage: `url(${u})` }} aria-label="Retirer la photo" onClick={() => setFiles((f) => f.filter((_, j) => j !== i))}>
              ×
            </button>
          ))}
          {room > 0 && (
            <button type="button" className="review-add" onClick={() => picker.current?.click()}>
              + Ajouter une photo
            </button>
          )}
        </div>
        <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      </div>

      {cat === 'emploi' && <p className="booking-note">Une offre d’emploi ne demande jamais de paiement au candidat. DALIL refuse toute annonce qui le fait.</p>}
      <p className="booking-note">{initial ? 'Après modification, l’annonce repasse au contrôle de l’équipe DALIL avant d’être de nouveau visible.' : 'L’équipe DALIL contrôle chaque annonce avant publication. Vous recevez le résultat par email.'}</p>
      {error && <p className="auth-msg error">{error}</p>}
      <button className="button primary auth-submit" disabled={busy}>
        {busy ? 'Envoi…' : initial ? 'Enregistrer et renvoyer au contrôle' : 'Déposer l’annonce'}
      </button>
    </form>
  )
}
