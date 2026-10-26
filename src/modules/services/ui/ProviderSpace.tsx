'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { LANGUAGES } from '@/platform/referentiel/languages'
import { CATEGORIES, CLIENTELE, DAYS, GENDERS, isSensitive } from '../activities'
import type { MissionView } from '../marketplace'
import { MissionList } from './MyMissions'
import { shrinkImage } from '@/platform/ui/shrink'
import { SmartText } from '@/platform/ui/SmartText'

type OfferRow = { activity: string; pricing: 'hour' | 'flat'; price?: number | null; unit?: string | null; hours?: number | null }
type Rule = { day: string; start: string; end: string }
type Closure = { from: string; to: string; note?: string | null }
type P = {
  id?: number
  status?: string
  slug?: string
  displayName?: string
  gender?: string
  bio?: string
  languages?: string[]
  clientele?: string
  experienceYears?: number | null
  offers?: OfferRow[]
  activities?: string[]
  payment?: string
  wilaya?: string
  baseCommune?: string | null
  wholeWilaya?: boolean
  communes?: string[]
  minNoticeHours?: number
  horizonDays?: number
  cancelNoticeHours?: number
  weekly?: Rule[]
  closures?: Closure[]
  legalForm?: string
  legalNumber?: string
  identityVerified?: boolean
  legalVerified?: boolean
  backgroundCheckedAt?: string | null
  photo?: { url?: string | null; sizes?: { thumb?: { url?: string | null } } } | number | null
}
type Doc = { kind: string; at: string }
type Wilaya = { code: number; name: string }

const STATUS: Record<string, string> = {
  pending: 'En attente de vérification : publiée après contrôle de votre identité, de votre statut légal et, pour les missions sensibles, de votre casier judiciaire.',
  published: 'Publiée : les clients peuvent vous envoyer des demandes.',
  suspended: 'Suspendue : contactez l’équipe DALIL.',
}

async function save(body: unknown) {
  const r = await fetch('/api/pro/prestataire', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const d = await r.json().catch(() => ({}))
  return r.ok ? { ok: true as const } : { ok: false as const, error: (d.error as string) ?? 'Enregistrement impossible.' }
}

/** Espace prestataire : demandes reçues, disponibilités, prestations et tarifs, zone, fiche et vérifications. */
export function ProviderSpace({ wilayas }: { wilayas: Wilaya[] }) {
  const [data, setData] = useState<{ provider: P | null; missions: MissionView[]; documents: Doc[] } | null>(null)
  const [tab, setTab] = useState<'demandes' | 'dispo' | 'prestations' | 'zone' | 'fiche'>('demandes')
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const load = () =>
    fetch('/api/pro/prestataire', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
  useEffect(() => {
    load()
  }, [])
  if (!data) return <p className="muted-line">Chargement…</p>
  const pr = data.provider

  const onSave = async (body: unknown) => {
    setMsg(null)
    const r = await save(body)
    if (!r.ok) return setMsg({ type: 'error', text: r.error })
    setMsg({ type: 'ok', text: 'Enregistré.' })
    load()
  }

  if (!pr)
    return (
      <section className="account-block">
        <h2>Devenir prestataire sur DALIL</h2>
        <p>Votre fiche est publiée après vérification de votre identité et de votre statut légal (carte d’auto-entrepreneur ou registre de commerce). Pour la garde d’enfants, l’aide à domicile et les cours, un extrait de casier judiciaire de moins de 3 mois est aussi demandé. La vérification ne dépend d’aucun abonnement.</p>
        {msg && <p className={`auth-msg ${msg.type}`}>{msg.text}</p>}
        <CreateForm wilayas={wilayas} onSubmit={onSave} />
      </section>
    )

  const pending = data.missions.filter((m) => m.canAccept)
  const upcoming = data.missions.filter((m) => m.status === 'accepted')
  const past = data.missions.filter((m) => !pending.includes(m) && !upcoming.includes(m))
  return (
    <>
      <div className={`pro-status pro-${pr.status}`}>
        <b>Votre fiche</b>
        <span>{STATUS[pr.status ?? 'pending']}</span>
        {pr.status === 'published' && pr.slug && (
          <Link href={`/prestataires/${pr.slug}`} className="auth-link">
            Voir ma page publique
          </Link>
        )}
      </div>
      <Checks pr={pr} documents={data.documents ?? []} onDone={(text, ok) => (setMsg({ type: ok ? 'ok' : 'error', text }), ok && load())} />
      <div className="auth-tabs pro-tabs" role="tablist">
        {(
          [
            ['demandes', `Demandes${pending.length ? ` (${pending.length})` : ''}`],
            ['dispo', 'Disponibilités'],
            ['prestations', 'Prestations & tarifs'],
            ['zone', 'Zone'],
            ['fiche', 'Ma fiche'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {msg && <p className={`auth-msg ${msg.type}`}>{msg.text}</p>}
      {tab === 'demandes' && (
        <>
          <section className="account-block">
            <h2>À accepter ou décliner</h2>
            <MissionList items={pending} empty="Aucune demande en attente." />
          </section>
          <section className="account-block">
            <h2>Missions à venir</h2>
            <MissionList items={upcoming} empty="Aucune mission acceptée." />
          </section>
          {!!past.length && (
            <section className="account-block">
              <h2>Historique</h2>
              <MissionList items={past} />
            </section>
          )}
        </>
      )}
      {tab === 'dispo' && <HoursForm pr={pr} onSubmit={onSave} />}
      {tab === 'prestations' && <OffersForm pr={pr} onSubmit={onSave} />}
      {tab === 'zone' && <ZoneForm pr={pr} wilayas={wilayas} onSubmit={onSave} />}
      {tab === 'fiche' && (
        <>
          <PhotoForm pr={pr} onDone={(text, ok) => (setMsg({ type: ok ? 'ok' : 'error', text }), ok && load())} />
          <ProfileForm pr={pr} onSubmit={onSave} />
        </>
      )}
    </>
  )
}

const DOC_LABELS: Record<string, string> = { identity: 'Pièce d’identité', legal: 'Carte d’auto-entrepreneur ou registre de commerce', background: 'Casier judiciaire (bulletin n° 3, moins de 3 mois)' }
const when = (iso: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(new Date(iso))

/** Vérifications : état de chaque contrôle et envoi des pièces (visibles par l’équipe seulement, supprimées après vérification). */
function Checks({ pr, documents, onDone }: { pr: P; documents: Doc[]; onDone: (text: string, ok: boolean) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const sensitive = isSensitive(pr.activities ?? [])
  const items: [string, string, boolean][] = [
    ['identity', 'Identité vérifiée|Identité à vérifier', Boolean(pr.identityVerified)],
    ['legal', 'Statut légal vérifié|Statut légal à vérifier', Boolean(pr.legalVerified)],
    ...(sensitive ? ([['background', 'Casier judiciaire vérifié|Casier judiciaire à vérifier', Boolean(pr.backgroundCheckedAt)]] as [string, string, boolean][]) : []),
  ]
  const send = async (kind: string, file?: File) => {
    if (!file) return
    setBusy(kind)
    const body = new FormData()
    body.set('kind', kind)
    body.set('file', await shrinkImage(file), file.type === 'application/pdf' ? 'piece.pdf' : 'piece.jpg')
    const r = await fetch('/api/pro/prestataire/pieces', { method: 'POST', body })
    const d = await r.json().catch(() => ({}))
    setBusy(null)
    onDone(r.ok ? 'Pièce reçue : l’équipe la vérifie, puis la supprime.' : (d.error ?? 'Envoi impossible.'), r.ok)
  }
  return (
    <section className="account-block pro-verify">
      <h2>Vérifications</h2>
      <ul className="pro-checks">
        {items.map(([k, l, ok]) => (
          <li key={k} className={ok ? 'is-ok' : ''}>
            {ok ? '✓' : '…'} {l.split('|')[ok ? 0 : 1]}
          </li>
        ))}
      </ul>
      {items
        .filter(([, , ok]) => !ok)
        .map(([k]) => {
          const sent = documents.find((d) => d.kind === k)
          return (
            <label key={k} className="doc-upload">
              <span>
                <b>{DOC_LABELS[k]}</b>
                <small>{sent ? `Reçue le ${when(sent.at)}, en cours de vérification. Vous pouvez la remplacer.` : 'Photo nette ou PDF, 4 Mo maximum.'}</small>
              </span>
              <span className="button outline">{busy === k ? 'Envoi…' : sent ? 'Remplacer' : 'Envoyer'}</span>
              <input type="file" accept="image/*,application/pdf" hidden disabled={busy !== null} onChange={(e) => send(k, e.target.files?.[0])} />
            </label>
          )
        })}
      <p className="muted-line">Vos pièces restent dans la base DALIL, visibles uniquement par l’équipe, et sont supprimées dès la vérification faite (30 jours au plus).</p>
    </section>
  )
}

const photoOf = (p: P) => (p.photo && typeof p.photo === 'object' ? (p.photo.sizes?.thumb?.url ?? p.photo.url ?? null) : null)

function PhotoForm({ pr, onDone }: { pr: P; onDone: (text: string, ok: boolean) => void }) {
  const [busy, setBusy] = useState(false)
  const send = async (file?: File) => {
    if (!file) return
    setBusy(true)
    const body = new FormData()
    body.set('photo', await shrinkImage(file, 1200), 'photo.jpg')
    const r = await fetch('/api/pro/prestataire/photo', { method: 'POST', body })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    onDone(r.ok ? 'Photo mise en ligne.' : (d.error ?? 'Envoi impossible.'), r.ok)
  }
  const url = photoOf(pr)
  return (
    <section className="account-block photo-form">
      <div className="praticien-photo large" style={url ? { backgroundImage: `url(${url})` } : undefined} aria-hidden="true">
        {!url && (pr.displayName ?? '?').charAt(0)}
      </div>
      <div>
        <h2>Photo de profil</h2>
        <p className="muted-line">Une photo de vous, de face et bien éclairée. Elle est en ligne tout de suite ; l’équipe la contrôle ensuite.</p>
        <label className="button outline">
          {busy ? 'Envoi…' : url ? 'Changer de photo' : 'Ajouter ma photo'}
          <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => send(e.target.files?.[0])} />
        </label>
      </div>
    </section>
  )
}

const ActivitySelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Activité" required>
    <option value="">Activité…</option>
    {CATEGORIES.map((c) => (
      <optgroup key={c.value} label={c.label}>
        {c.activities.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </optgroup>
    ))}
  </select>
)

function OffersEditor({ rows, setRows }: { rows: OfferRow[]; setRows: (r: OfferRow[]) => void }) {
  const set = (i: number, patch: Partial<OfferRow>) => setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  return (
    <>
      {rows.map((r, i) => (
        <div key={i} className="hours-row offer-row">
          <ActivitySelect value={r.activity} onChange={(v) => set(i, { activity: v })} />
          <select value={r.pricing} onChange={(e) => set(i, { pricing: e.target.value as OfferRow['pricing'] })} aria-label="Type de tarif">
            <option value="hour">À l’heure</option>
            <option value="flat">Forfait</option>
          </select>
          <input type="number" min={0} step={50} value={r.price ?? ''} onChange={(e) => set(i, { price: e.target.value === '' ? null : Number(e.target.value) })} placeholder={r.pricing === 'hour' ? 'DA / heure' : 'DA le forfait'} aria-label="Prix en dinars" />
          {r.pricing === 'flat' && (
            <>
              <input value={r.unit ?? ''} onChange={(e) => set(i, { unit: e.target.value })} placeholder="la séance, par meuble…" aria-label="Unité du forfait" />
              <input type="number" min={0.5} max={12} step={0.5} value={r.hours ?? 2} onChange={(e) => set(i, { hours: Number(e.target.value) })} aria-label="Durée indicative en heures" title="Durée indicative (h)" />
            </>
          )}
          <button type="button" className="auth-link" onClick={() => setRows(rows.filter((_, k) => k !== i))}>
            Retirer
          </button>
        </div>
      ))}
      <button type="button" className="button outline" onClick={() => setRows([...rows, { activity: '', pricing: 'hour', price: null }])}>
        + Ajouter une prestation
      </button>
    </>
  )
}

function CreateForm({ wilayas, onSubmit }: { wilayas: Wilaya[]; onSubmit: (b: unknown) => void }) {
  const [rows, setRows] = useState<OfferRow[]>([{ activity: '', pricing: 'hour', price: null }])
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    onSubmit({
      displayName: f.get('displayName'),
      gender: f.get('gender'),
      legalForm: f.get('legalForm'),
      legalNumber: f.get('legalNumber'),
      wilaya: f.get('wilaya'),
      wholeWilaya: true,
      languages: f.getAll('languages'),
      clientele: f.get('clientele'),
      bio: f.get('bio'),
      offers: rows.filter((r) => r.activity),
      weekly: [1, 2, 3, 4, 6].flatMap((d) => [{ day: String(d), start: '09:00', end: '13:00' }, { day: String(d), start: '14:00', end: '18:00' }]),
    })
  }
  return (
    <form className="auth-form pro-form" onSubmit={submit}>
      <div className="auth-row">
        <label>
          Nom affiché
          <input name="displayName" required maxLength={60} placeholder="Karim B." />
          <small>Prénom et initiale du nom.</small>
        </label>
        <label>
          Vous êtes
          <select name="gender" required defaultValue="">
            <option value="" disabled>
              Choisir…
            </option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <small>Vérifié avec votre pièce d’identité.</small>
        </label>
      </div>
      <div className="auth-row">
        <label>
          Statut légal
          <select name="legalForm" required defaultValue="">
            <option value="" disabled>
              Choisir…
            </option>
            <option value="auto-entrepreneur">Auto-entrepreneur (carte ANAE)</option>
            <option value="registre-commerce">Registre de commerce</option>
          </select>
        </label>
        <label>
          Numéro
          <input name="legalNumber" required maxLength={40} />
        </label>
        <label>
          Wilaya
          <select name="wilaya" required defaultValue="">
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
      </div>
      <fieldset>
        <legend>Prestations et tarifs</legend>
        <OffersEditor rows={rows} setRows={setRows} />
      </fieldset>
      <fieldset>
        <legend>Langues parlées</legend>
        <div className="check-grid">
          {LANGUAGES.map((l) => (
            <label key={l.value} className="auth-check">
              <input type="checkbox" name="languages" value={l.value} />
              <span>{l.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Clientèle
        <select name="clientele" defaultValue="all">
          {CLIENTELE.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Présentation
        <SmartText multiline sentence name="bio" maxLength={1500} rows={4} placeholder="Votre expérience, votre façon de travailler, votre matériel…" />
      </label>
      <p className="muted-line">Disponibilités préremplies (samedi–mercredi, 9 h–13 h et 14 h–18 h) : ajustez-les ensuite. Zone : toute la wilaya, à préciser par commune ensuite.</p>
      <button className="button primary auth-submit">Envoyer ma fiche pour vérification</button>
    </form>
  )
}

function ProfileForm({ pr, onSubmit }: { pr: P; onSubmit: (b: unknown) => void }) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    onSubmit({ bio: f.get('bio'), languages: f.getAll('languages'), clientele: f.get('clientele'), experienceYears: Number(f.get('experienceYears')) || null, payment: f.get('payment'), legalForm: f.get('legalForm'), legalNumber: f.get('legalNumber') })
  }
  return (
    <form className="auth-form pro-form" onSubmit={submit}>
      <p className="muted-line">
        {pr.displayName} · {GENDERS.find((g) => g.value === pr.gender)?.label} — nom et genre modifiables par l’équipe DALIL. <Link href="/proposer">Demander une modification</Link>
      </p>
      <label>
        Présentation
        <SmartText multiline sentence name="bio" defaultValue={pr.bio ?? ''} maxLength={1500} rows={4} />
      </label>
      <div className="auth-row">
        <label>
          Années d’expérience
          <input name="experienceYears" type="number" min={0} max={70} defaultValue={pr.experienceYears ?? ''} />
        </label>
        <label>
          Paiements acceptés
          <input name="payment" defaultValue={pr.payment ?? ''} placeholder="Espèces, BaridiMob, CIB/Edahabia" />
        </label>
        <label>
          Clientèle
          <select name="clientele" defaultValue={pr.clientele ?? 'all'}>
            {CLIENTELE.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Langues parlées</legend>
        <div className="check-grid">
          {LANGUAGES.map((l) => (
            <label key={l.value} className="auth-check">
              <input type="checkbox" name="languages" value={l.value} defaultChecked={(pr.languages ?? []).includes(l.value)} />
              <span>{l.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="auth-row">
        <label>
          Statut légal
          <select name="legalForm" defaultValue={pr.legalForm ?? ''}>
            <option value="auto-entrepreneur">Auto-entrepreneur (carte ANAE)</option>
            <option value="registre-commerce">Registre de commerce</option>
          </select>
        </label>
        <label>
          Numéro
          <input name="legalNumber" defaultValue={pr.legalNumber ?? ''} maxLength={40} />
          <small>Le modifier relance la vérification.</small>
        </label>
      </div>
      <p className="booking-note">DALIL n’encaisse rien : vos clients vous paient directement.</p>
      <button className="button primary auth-submit">Enregistrer</button>
    </form>
  )
}

function OffersForm({ pr, onSubmit }: { pr: P; onSubmit: (b: unknown) => void }) {
  const [rows, setRows] = useState<OfferRow[]>((pr.offers ?? []).map((o) => ({ activity: o.activity, pricing: o.pricing ?? 'hour', price: o.price ?? null, unit: o.unit ?? null, hours: o.hours ?? 2 })))
  const sensitiveAdded = isSensitive(rows.map((r) => r.activity)) && !pr.backgroundCheckedAt
  return (
    <form
      className="auth-form pro-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ offers: rows.filter((r) => r.activity) })
      }}
    >
      <h2>Prestations et tarifs</h2>
      <p className="muted-line">À l’heure ou au forfait, selon l’activité. Le prix final se confirme avec le client dans la messagerie.</p>
      <OffersEditor rows={rows} setRows={setRows} />
      {sensitiveAdded && <p className="auth-msg error">Garde d’enfants, aide à domicile et cours : un extrait de casier judiciaire (bulletin n° 3) de moins de 3 mois sera demandé avant publication.</p>}
      <button className="button primary auth-submit">Enregistrer mes prestations</button>
    </form>
  )
}

function ZoneForm({ pr, wilayas, onSubmit }: { pr: P; wilayas: Wilaya[]; onSubmit: (b: unknown) => void }) {
  const [wilaya, setWilaya] = useState(pr.wilaya ?? '')
  const [list, setList] = useState<{ id: string; name: string }[] | null>(null)
  const [whole, setWhole] = useState(Boolean(pr.wholeWilaya))
  const [picked, setPicked] = useState<Set<string>>(new Set(pr.communes ?? []))
  const [base, setBase] = useState(pr.baseCommune ?? '')
  const [q, setQ] = useState('')
  useEffect(() => {
    if (!wilaya) return
    setList(null)
    fetch(`/api/communes?wilaya=${wilaya}`)
      .then((r) => r.json())
      .then((d) => setList(d.communes))
  }, [wilaya])
  const shown = useMemo(() => (list ?? []).filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())), [list, q])
  const toggle = (id: string) => {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked(next)
  }
  return (
    <form
      className="auth-form pro-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ wilaya, wholeWilaya: whole, baseCommune: base || null, communes: whole ? [] : [...picked] })
      }}
    >
      <h2>Zone d’intervention</h2>
      <div className="auth-row">
        <label>
          Wilaya
          <select
            value={wilaya}
            onChange={(e) => {
              setWilaya(e.target.value)
              setPicked(new Set())
              setBase('')
            }}
          >
            {wilayas.map((w) => (
              <option key={w.code} value={String(w.code)}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Commune de base
          <select value={base} onChange={(e) => setBase(e.target.value)}>
            <option value="">Choisir…</option>
            {(list ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="auth-check">
        <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} />
        <span>J’interviens dans toute la wilaya</span>
      </label>
      {!whole &&
        (list === null ? (
          <p className="muted-line">Chargement des communes…</p>
        ) : !list.length ? (
          <p className="muted-line">La liste des communes de cette wilaya arrive bientôt : cochez « toute la wilaya » en attendant.</p>
        ) : (
          <fieldset>
            <legend>
              Communes desservies ({picked.size}/{list.length})
            </legend>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une commune" aria-label="Rechercher une commune" />
            <div className="check-grid commune-grid">
              {shown.map((c) => (
                <label key={c.id} className="auth-check">
                  <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      <p className="muted-line">Bientôt : un rayon en kilomètres autour de votre commune de base, calculé par DALIL.</p>
      <button className="button primary auth-submit">Enregistrer ma zone</button>
    </form>
  )
}

function HoursForm({ pr, onSubmit }: { pr: P; onSubmit: (b: unknown) => void }) {
  const [weekly, setWeekly] = useState<Rule[]>((pr.weekly ?? []).map((r) => ({ day: String(r.day), start: r.start, end: r.end })))
  const [closures, setClosures] = useState<Closure[]>((pr.closures ?? []).map((c) => ({ from: String(c.from).slice(0, 10), to: String(c.to).slice(0, 10), note: c.note })))
  const set = (i: number, patch: Partial<Rule>) => setWeekly(weekly.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    onSubmit({ weekly: weekly.filter((r) => r.start && r.end), closures: closures.filter((c) => c.from && c.to), minNoticeHours: Number(f.get('minNoticeHours')), horizonDays: Number(f.get('horizonDays')), cancelNoticeHours: Number(f.get('cancelNoticeHours')) })
  }
  return (
    <form className="auth-form pro-form" onSubmit={submit}>
      <h2>Disponibilités</h2>
      <p className="muted-line">En heure d’Alger. Les clients choisissent une heure de début dans ces plages ; une mission acceptée bloque le temps prévu.</p>
      {weekly.map((r, i) => (
        <div key={i} className="hours-row">
          <select value={r.day} onChange={(e) => set(i, { day: e.target.value })} aria-label="Jour">
            {DAYS.map((d, k) => (
              <option key={d} value={String(k)}>
                {d}
              </option>
            ))}
          </select>
          <input type="time" value={r.start} onChange={(e) => set(i, { start: e.target.value })} aria-label="Début" required />
          <input type="time" value={r.end} onChange={(e) => set(i, { end: e.target.value })} aria-label="Fin" required />
          <button type="button" className="auth-link" onClick={() => setWeekly(weekly.filter((_, k) => k !== i))}>
            Retirer
          </button>
        </div>
      ))}
      <button type="button" className="button outline" onClick={() => setWeekly([...weekly, { day: '6', start: '09:00', end: '13:00' }])}>
        + Ajouter une plage
      </button>
      <div className="auth-row">
        <label>
          Délai minimum avant une mission (h)
          <input name="minNoticeHours" type="number" min={0} defaultValue={pr.minNoticeHours ?? 12} />
        </label>
        <label>
          Demandes ouvertes sur (jours)
          <input name="horizonDays" type="number" min={1} max={365} defaultValue={pr.horizonDays ?? 60} />
        </label>
        <label>
          Annulation gratuite jusqu’à (h avant)
          <input name="cancelNoticeHours" type="number" min={0} defaultValue={pr.cancelNoticeHours ?? 24} />
        </label>
      </div>
      <h2>Absences et congés</h2>
      {closures.map((c, i) => (
        <div key={i} className="hours-row">
          <input type="date" value={c.from} onChange={(e) => setClosures(closures.map((x, k) => (k === i ? { ...x, from: e.target.value } : x)))} aria-label="Du" required />
          <input type="date" value={c.to} onChange={(e) => setClosures(closures.map((x, k) => (k === i ? { ...x, to: e.target.value } : x)))} aria-label="Au" required />
          <input value={c.note ?? ''} onChange={(e) => setClosures(closures.map((x, k) => (k === i ? { ...x, note: e.target.value } : x)))} placeholder="Motif (privé)" aria-label="Motif" />
          <button type="button" className="auth-link" onClick={() => setClosures(closures.filter((_, k) => k !== i))}>
            Retirer
          </button>
        </div>
      ))}
      <button type="button" className="button outline" onClick={() => setClosures([...closures, { from: '', to: '' }])}>
        + Ajouter une absence
      </button>
      <button className="button primary auth-submit">Enregistrer mes disponibilités</button>
    </form>
  )
}
