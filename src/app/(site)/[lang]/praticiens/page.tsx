import { isLang } from '@/platform/i18n'
import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { FaqBlock } from '@/modules/contenus/ui'
import { SponsoredList } from '@/modules/pros/ui'
import { LANGUAGES, SPECIALTIES, isComplementary, languageLabel, searchPractitioners, specialtyLabel } from '@/modules/sante'
import { searchPlaces, type PlaceCard } from '@/modules/annuaire'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { withSectionGate } from '@/platform/ui/SectionGate'

export const metadata: Metadata = { title: 'Trouver un praticien', description: 'Trouvez un professionnel de santé près de vous : coordonnées, et rendez-vous en ligne chez les praticiens qui le proposent.' }
export const dynamic = 'force-dynamic'

type Q = { specialite?: string; wilaya?: string; mode?: string; langue?: string; q?: string }
const TZ = 'Africa/Algiers'
const nextLabel = (iso: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(iso))
const groups = [...new Set(SPECIALTIES.map((s) => s.group))]
/**
 * Aucun praticien réservable : jamais une page vide (décision de Rad, 2026-10-26).
 * On montre de vrais établissements de santé de l’annuaire (sources ouvertes, statut affiché) : la wilaya choisie d’abord.
 */
async function healthPlaces(wilaya?: string, specialty?: string): Promise<PlaceCard[]> {
  const category = specialty === 'hijama' ? 'Hijama' : undefined
  // Les médecins d’abord, puis cliniques et hôpitaux ; pharmacies et laboratoires ne sont pas des praticiens.
  const pick = (list: PlaceCard[]) => {
    const kept = list.filter((p) => category || !['Pharmacies', 'Laboratoires'].includes(p.category))
    const doctor = (p: PlaceCard) => ['Médecins', 'Dentistes'].includes(p.category)
    return [...kept.filter(doctor), ...kept.filter((p) => !doctor(p))].slice(0, 12)
  }
  const local = wilaya ? pick((await searchPlaces({ sector: 'sante-soins', category, wilaya }, 120)).places) : []
  if (local.length) return local
  return pick((await searchPlaces({ sector: 'sante-soins', category }, 120)).places)
}

async function Practitioners({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Q> }) {
  const q = await searchParams
  const { lang: raw } = await params
  const lang = isLang(raw) ? raw : 'fr'
  const results = await searchPractitioners({ specialty: q.specialite, wilaya: q.wilaya, mode: q.mode, language: q.langue, text: q.q?.slice(0, 80) })
  const wilaya = q.wilaya ? WILAYAS.find((w) => String(w.code) === q.wilaya)?.name : null
  // Une seule liste (Rad, 2026-11-15) : les praticiens réservables en ligne, puis les médecins de l’annuaire. Jamais de page vide.
  const nearby = await healthPlaces(q.wilaya, q.specialite)
  return (
    <div className="praticiens">
      <section className="praticiens-hero">
        <div className="container">
          <p className="eyebrow">Santé</p>
          <h1>Trouver un praticien.</h1>
          <p className="auth-lead">Trouvez un professionnel de santé près de vous. Prenez rendez-vous en ligne quand le praticien le propose, sinon appelez-le.</p>
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
                {[...WILAYAS].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((w) => (
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
        <SponsoredList lang={lang} collection="practitioners" wilaya={q.wilaya} where={q.specialite ? { specialties: { in: [q.specialite] } } : undefined} />
        {results.length > 0 && (
          <p className="praticiens-count">
            {results.length} praticien{results.length > 1 ? 's' : ''} avec rendez-vous en ligne
            {q.specialite ? ` · ${specialtyLabel(q.specialite)}` : ''}
            {wilaya ? ` · ${wilaya}` : ''}
          </p>
        )}
        {results.length > 0 && (
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
                    {p.demo && <span className="chip chip-plain">Exemple</span>}
                    {p.verified && <span className="chip">Identité et diplôme vérifiés</span>}
                    {p.modes.includes('visio') && <span className="chip">Visio</span>}
                    {p.fee && <span className="chip chip-plain">{p.fee}</span>}
                    {!!p.languages.length && <span className="chip chip-plain">{p.languages.map(languageLabel).join(' · ')}</span>}
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
        )}
        <div className="praticiens-empty">
          <h2>{wilaya ? `Médecins et établissements à ${wilaya}` : 'Médecins et établissements de santé'}</h2>
          <p>Appelez directement ou préparez votre visite. Le rendez-vous en ligne s’ajoute dès qu’un praticien rejoint DALIL.</p>
          {!!nearby.length && (
            <ul className="praticien-list">
              {nearby.map((p) => (
                <li key={p.slug} className="praticien-card">
                  <div className="praticien-photo" style={p.photo && !p.photo.includes('/images/lieu') ? { backgroundImage: `url(${p.photo})` } : undefined} aria-hidden="true">
                    {(!p.photo || p.photo.includes('/images/lieu')) && p.name.replace(/^(Dr\.?|Docteur|Cabinet|Clinique)\s*/i, '').charAt(0).toUpperCase()}
                  </div>
                  <div className="praticien-body">
                    <Link href={`/adresses/${p.slug}`}>
                      <h3>{p.name}</h3>
                    </Link>
                    <p>{p.category}</p>
                    <p className="muted-line">{p.city}</p>
                    <div className="praticien-tags">
                      <span className="chip chip-plain">Annuaire DALIL</span>
                      {!!p.languages.length && <span className="chip chip-plain">{p.languages.map(languageLabel).join(' · ')}</span>}
                    </div>
                  </div>
                  <div className="praticien-next">
                    <small>Prise de contact</small>
                    <b>Sur appel</b>
                    <Link className="button primary" href={`/adresses/${p.slug}`}>
                      Voir la fiche et appeler
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p>
            <Link href={`/annuaire/sante-soins${q.wilaya ? `?wilaya=${q.wilaya}` : ''}`}>Tous les établissements de santé ›</Link>
          </p>
          <Link className="button outline" href="/connexion/professionnel">
            Vous êtes praticien ? Activez la prise de rendez-vous
          </Link>
        </div>
      </section>
      <FaqBlock lang={lang} path="/praticiens" />
    </div>
  )
}

export default withSectionGate(Practitioners, () => '/praticiens')
