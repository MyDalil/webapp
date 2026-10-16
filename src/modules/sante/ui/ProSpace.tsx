'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { AppointmentList } from './MyAppointments'
import { DAYS, LANGUAGES, SPECIALTIES } from '../specialties'
import { SmartText } from '@/platform/ui/SmartText'

type Rule = { day: string; start: string; end: string; mode: 'both' | 'cabinet' | 'visio' }
type Closure = { from: string; to: string; note?: string }
type P = Record<string, unknown> & { id?: number; status?: string; slug?: string; name?: string; weekly?: Rule[]; closures?: Closure[]; specialties?: string[]; languages?: string[]; modes?: string[] }

const STATUS: Record<string, string> = {
  pending: 'En attente de vérification : votre fiche sera publiée après vérification de votre identité et de votre droit d’exercer.',
  published: 'Publiée : les patients peuvent réserver.',
  suspended: 'Suspendue : contactez l’équipe DALIL.',
}

async function save(body: unknown) {
  const r = await fetch('/api/pro/praticien', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const d = await r.json().catch(() => ({}))
  return r.ok ? { ok: true as const, practitioner: d.practitioner as P } : { ok: false as const, error: (d.error as string) ?? 'Enregistrement impossible.' }
}

/** Espace praticien : création de la fiche, horaires, congés et agenda des rendez-vous. */
export function ProSpace({ wilayas }: { wilayas: { code: number; name: string }[] }) {
  const [data, setData] = useState<{ practitioner: P | null; agenda: never[] } | null>(null)
  const [tab, setTab] = useState<'agenda' | 'horaires' | 'fiche'>('agenda')
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const load = () =>
    fetch('/api/pro/praticien', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
  useEffect(() => {
    load()
  }, [])
  if (!data) return <p className="muted-line">Chargement…</p>
  const pr = data.practitioner

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
        <h2>Créer votre fiche praticien</h2>
        <p>Votre fiche sera publiée après vérification de votre identité et de votre droit d’exercer par l’équipe DALIL. La vérification ne dépend d’aucun abonnement.</p>
        {msg && <p className={`auth-msg ${msg.type}`}>{msg.text}</p>}
        <ProfileForm initial={{}} wilayas={wilayas} creating onSubmit={onSave} />
      </section>
    )

  return (
    <>
      <div className={`pro-status pro-${pr.status}`}>
        <b>Votre fiche</b> — {STATUS[pr.status ?? 'pending']}
        {pr.status === 'published' && pr.slug && (
          <Link href={`/praticiens/${pr.slug}`} className="auth-link">
            Voir ma page publique
          </Link>
        )}
      </div>
      <div className="auth-tabs pro-tabs" role="tablist">
        {(
          [
            ['agenda', 'Agenda'],
            ['horaires', 'Horaires & congés'],
            ['fiche', 'Ma fiche'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {msg && <p className={`auth-msg ${msg.type}`}>{msg.text}</p>}
      {tab === 'agenda' && (
        <section className="account-block">
          <h2>Rendez-vous</h2>
          <AppointmentList items={data.agenda} side="practitioner" onChange={load} />
        </section>
      )}
      {tab === 'horaires' && <HoursForm pr={pr} onSubmit={onSave} />}
      {tab === 'fiche' && <ProfileForm initial={pr} wilayas={wilayas} onSubmit={onSave} />}
    </>
  )
}

function ProfileForm({ initial, wilayas, creating, onSubmit }: { initial: P; wilayas: { code: number; name: string }[]; creating?: boolean; onSubmit: (b: unknown) => void }) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      title: f.get('title'),
      bio: f.get('bio'),
      cabinetName: f.get('cabinetName'),
      address: f.get('address'),
      city: f.get('city'),
      wilaya: f.get('wilaya') || null,
      phone: f.get('phone'),
      fee: f.get('fee'),
      payment: f.get('payment'),
      paymentLink: f.get('paymentLink'),
      modes: f.getAll('modes'),
      languages: f.getAll('languages'),
    }
    if (creating) {
      body.name = f.get('name')
      body.specialties = f.getAll('specialties')
      body.diplomas = [{ title: f.get('diploma'), institution: f.get('institution'), year: Number(f.get('year')) || undefined }]
    }
    onSubmit(body)
  }
  const v = (k: string) => (typeof initial[k] === 'string' ? (initial[k] as string) : '')
  return (
    <form className="auth-form pro-form" onSubmit={submit}>
      {creating ? (
        <>
          <label>
            Nom affiché
            <input name="name" required placeholder="Dr Amina Benali" />
          </label>
          <fieldset>
            <legend>Spécialités</legend>
            <div className="check-grid">
              {SPECIALTIES.map((s) => (
                <label key={s.value} className="auth-check">
                  <input type="checkbox" name="specialties" value={s.value} />
                  <span>
                    {s.label}
                    {s.group === 'Pratiques complémentaires' && <small> (complémentaire)</small>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="auth-row">
            <label>
              Diplôme principal
              <input name="diploma" required placeholder="Doctorat en médecine" />
            </label>
            <label>
              Établissement
              <input name="institution" placeholder="Faculté de médecine d’Alger" />
            </label>
            <label>
              Année
              <input name="year" type="number" min={1950} max={2100} />
            </label>
          </div>
        </>
      ) : (
        <p className="muted-line">
          Nom, spécialités et diplômes : modifiables par l’équipe DALIL après vérification. <Link href="/proposer">Demander une modification</Link>
        </p>
      )}
      <div className="auth-row">
        <label>
          Titre affiché
          <input name="title" defaultValue={v('title')} placeholder="Médecin généraliste" />
        </label>
        <label>
          Téléphone du cabinet
          <input name="phone" defaultValue={v('phone')} />
        </label>
      </div>
      <label>
        Présentation
        <SmartText multiline sentence name="bio" defaultValue={v('bio')} maxLength={1500} rows={4} />
      </label>
      <div className="auth-row">
        <label>
          Cabinet ou clinique
          <input name="cabinetName" defaultValue={v('cabinetName')} />
        </label>
        <label>
          Adresse
          <input name="address" defaultValue={v('address')} />
        </label>
      </div>
      <div className="auth-row">
        <label>
          Ville
          <input name="city" required defaultValue={v('city')} />
        </label>
        <label>
          Wilaya
          <select name="wilaya" defaultValue={v('wilaya')}>
            <option value="">Choisir…</option>
            {wilayas.map((w) => (
              <option key={w.code} value={String(w.code)}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Consultations</legend>
        <div className="check-grid">
          {(
            [
              ['cabinet', 'Au cabinet'],
              ['visio', 'En visio'],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className="auth-check">
              <input type="checkbox" name="modes" value={k} defaultChecked={(initial.modes ?? ['cabinet']).includes(k)} />
              <span>{l}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Langues parlées</legend>
        <div className="check-grid">
          {LANGUAGES.map((l) => (
            <label key={l.value} className="auth-check">
              <input type="checkbox" name="languages" value={l.value} defaultChecked={(initial.languages ?? []).includes(l.value)} />
              <span>{l.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="auth-row">
        <label>
          Tarif
          <input name="fee" defaultValue={v('fee')} placeholder="2 500 DA" />
        </label>
        <label>
          Paiement
          <input name="payment" defaultValue={v('payment')} placeholder="Espèces au cabinet, BaridiMob" />
        </label>
      </div>
      <label>
        Votre lien de paiement (facultatif)
        <input name="paymentLink" type="url" defaultValue={v('paymentLink')} />
        <small>Le patient vous paie directement : DALIL n’encaisse rien.</small>
      </label>
      <button className="button primary auth-submit">{creating ? 'Envoyer ma fiche pour vérification' : 'Enregistrer'}</button>
    </form>
  )
}

function HoursForm({ pr, onSubmit }: { pr: P; onSubmit: (b: unknown) => void }) {
  const [weekly, setWeekly] = useState<Rule[]>((pr.weekly ?? []).map((r) => ({ day: String(r.day), start: r.start, end: r.end, mode: r.mode ?? 'both' })))
  const [closures, setClosures] = useState<Closure[]>((pr.closures ?? []).map((c) => ({ from: String(c.from).slice(0, 10), to: String(c.to).slice(0, 10), note: c.note })))
  const num = (k: string, d: number) => (typeof pr[k] === 'number' ? (pr[k] as number) : d)
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    onSubmit({
      weekly: weekly.filter((r) => r.start && r.end),
      closures: closures.filter((c) => c.from && c.to),
      slotMinutes: Number(f.get('slotMinutes')),
      minNoticeHours: Number(f.get('minNoticeHours')),
      horizonDays: Number(f.get('horizonDays')),
      cancelNoticeHours: Number(f.get('cancelNoticeHours')),
    })
  }
  const set = (i: number, patch: Partial<Rule>) => setWeekly(weekly.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  return (
    <form className="auth-form pro-form" onSubmit={submit}>
      <h2>Horaires de consultation</h2>
      <p className="muted-line">En heure d’Alger. Ajoutez une plage par demi-journée de consultation.</p>
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
          <select value={r.mode} onChange={(e) => set(i, { mode: e.target.value as Rule['mode'] })} aria-label="Type">
            <option value="both">Cabinet et visio</option>
            <option value="cabinet">Cabinet</option>
            <option value="visio">Visio</option>
          </select>
          <button type="button" className="auth-link" onClick={() => setWeekly(weekly.filter((_, k) => k !== i))}>
            Retirer
          </button>
        </div>
      ))}
      <button type="button" className="button outline" onClick={() => setWeekly([...weekly, { day: '0', start: '09:00', end: '12:00', mode: 'both' }])}>
        + Ajouter une plage
      </button>
      <div className="auth-row">
        <label>
          Durée d’un rendez-vous (min)
          <input name="slotMinutes" type="number" min={10} max={240} step={5} defaultValue={num('slotMinutes', 30)} />
        </label>
        <label>
          Réservation au plus tard (h avant)
          <input name="minNoticeHours" type="number" min={0} defaultValue={num('minNoticeHours', 2)} />
        </label>
        <label>
          Agenda ouvert sur (jours)
          <input name="horizonDays" type="number" min={1} max={365} defaultValue={num('horizonDays', 60)} />
        </label>
        <label>
          Annulation patient jusqu’à (h avant)
          <input name="cancelNoticeHours" type="number" min={0} defaultValue={num('cancelNoticeHours', 24)} />
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
      <button className="button primary auth-submit">Enregistrer mes horaires</button>
    </form>
  )
}
