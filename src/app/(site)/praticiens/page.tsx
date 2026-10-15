import type { Metadata } from 'next'
import Link from 'next/link'
import { LANGUAGES, SPECIALTIES, isComplementary, searchPractitioners, specialtyLabel } from '@/modules/sante'
import { WILAYAS } from '@/platform/referentiel/catalog'

export const metadata: Metadata = { title: 'Trouver un praticien · DALIL', description: 'Prenez rendez-vous en ligne avec un médecin ou un praticien vérifié par DALIL, au cabinet ou en visio.' }
export const dynamic = 'force-dynamic'

type Q = { specialite?: string; wilaya?: string; mode?: string; langue?: string; q?: string }
const TZ = 'Africa/Algiers'
const nextLabel = (iso: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(iso))
const groups = [...new Set(SPECIALTIES.map((s) => s.group))]

export default async function Practitioners({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams
  const results = await searchPractitioners({ specialty: q.specialite, wilaya: q.wilaya, mode: q.mode, language: q.langue, text: q.q?.slice(0, 80) })
  const wilaya = q.wilaya ? WILAYAS.find((w) => String(w.code) === q.wilaya)?.name : null
  return (
    <div className="praticiens">
      <section className="praticiens-hero">
        <div className="container">
          <p className="eyebrow">Santé</p>
          <h1>Trouver un praticien.</h1>
          <p className="auth-lead">Prenez rendez-vous en ligne, au cabinet ou en visio. Identité et diplômes vérifiés par DALIL.</p>
          <form className="praticiens-search" action="/praticiens">
            <label>
              <span>Spécialité</span>
              <select name="specialite" defaultValue={q.specialite ?? ''}>
                <option value="">Toutes</option>
                {groups.map((g) => (
                  <optgroup key={g} label={g}>
                    {SPECIALTIES.filter((s) => s.group === g).map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label>
              <span>Où</span>
              <select name="wilaya" defaultValue={q.wilaya ?? ''}>
                <option value="">Toute l’Algérie</option>
                {[...WILAYAS].filter((w) => !w.transition).sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((w) => (
                  <option key={w.code} value={String(w.code)}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Consultation</span>
              <select name="mode" defaultValue={q.mode ?? ''}>
                <option value="">Cabinet ou visio</option>
                <option value="cabinet">Au cabinet</option>
                <option value="visio">En visio</option>
              </select>
            </label>
            <label>
              <span>Langue</span>
              <select name="langue" defaultValue={q.langue ?? ''}>
                <option value="">Toutes</option>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button primary">Rechercher</button>
          </form>
        </div>
      </section>

      <section className="section container">
        <p className="praticiens-count">
          {results.length} praticien{results.length > 1 ? 's' : ''}
          {q.specialite ? ` · ${specialtyLabel(q.specialite)}` : ''}
          {wilaya ? ` · ${wilaya}` : ''}
        </p>
        {results.length ? (
          <ul className="praticien-list">
            {results.map((p) => (
              <li key={p.slug} className="praticien-card">
                <div className="praticien-photo" style={p.photo ? { backgroundImage: `url(${p.photo})` } : undefined} aria-hidden="true">
                  {!p.photo && p.name.replace(/^Dr\.?\s*/i, '').charAt(0)}
                </div>
                <div className="praticien-body">
                  <Link href={`/praticiens/${p.slug}`}>
                    <h2>{p.name}</h2>
                  </Link>
                  <p>{p.specialties.map(specialtyLabel).join(' · ')}{p.specialties.some(isComplementary) ? ' (pratique complémentaire)' : ''}</p>
                  <p className="muted-line">{[p.address, p.city].filter(Boolean).join(', ')}</p>
                  <div className="praticien-tags">
                    {p.verified && <span className="chip">Identité et diplôme vérifiés</span>}
                    {p.modes.includes('visio') && <span className="chip">Visio</span>}
                    {p.fee && <span className="chip chip-plain">{p.fee}</span>}
                  </div>
                </div>
                <div className="praticien-next">
                  {p.next ? (
                    <>
                      <small>Prochaine disponibilité</small>
                      <b>{nextLabel(p.next)}</b>
                    </>
                  ) : (
                    <small>Pas de disponibilité dans les 30 jours</small>
                  )}
                  <Link className="button primary" href={`/praticiens/${p.slug}`}>
                    Prendre rendez-vous
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="praticiens-empty">
            <h2>Aucun praticien pour cette recherche, pour l’instant.</h2>
            <p>Les praticiens rejoignent DALIL au fur et à mesure, après vérification. Élargissez la recherche ou revenez bientôt.</p>
            <Link className="button outline" href="/connexion/professionnel">
              Vous êtes praticien ? Rejoindre DALIL
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
