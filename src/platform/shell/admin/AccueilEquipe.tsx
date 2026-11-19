import Link from 'next/link'
import type { Payload } from 'payload'
import { A_RELIRE, CASES, isTeam, listHref, shown, type Tache } from './accueil'
import { IconCheck, IconHelp, IconImport, IconShield } from './icons'
import { ADMIN_CSS } from './styles'

type Props = { payload: Payload; user?: unknown }

async function compter(payload: Payload, t: Tache): Promise<number | null> {
  try {
    const r = await payload.count({ collection: t.collection as never, where: t.where as never, overrideAccess: true })
    return r.totalDocs
  } catch {
    return null
  }
}

/**
 * Accueil de l’équipe en haut du tableau de bord /admin (à enregistrer en `admin.components.beforeDashboard`).
 * Ce qui attend une action (un comptage léger par case, lien vers la liste filtrée), puis trois actions.
 * Équipe seulement (patron, admin, editor) ; aucun autre compte ne voit rien.
 */
export async function AccueilEquipe({ payload, user }: Props) {
  if (!isTeam(user)) return null
  const all = [...A_RELIRE, ...CASES]
  const counts = await Promise.all(all.map((t) => compter(payload, t)))
  const n = Object.fromEntries(all.map((t, i) => [t.key, counts[i]]))
  const totalRelire = A_RELIRE.reduce<number | null>((s, t) => (s == null || n[t.key] == null ? null : s + (n[t.key] as number)), 0)
  return (
    <section className="ae" aria-label="À faire aujourd’hui">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <div className="ae-head">
        <img src="/favicon.svg" alt="" width={36} height={36} />
        <div>
          <h2>À faire aujourd’hui</h2>
          <p>Chaque case mène à la liste à traiter. Rien n’est publié sans votre clic.</p>
        </div>
      </div>
      <div className="ae-grid">
        <div className="ae-card ae-wide">
          <h3>À relire</h3>
          <span className={`ae-num${totalRelire === 0 ? ' is-zero' : ''}`}>{shown(totalRelire)}</span>
          <ul className="ae-rows">
            {A_RELIRE.map((t) => (
              <li key={t.key}>
                <a href={listHref(t)}>
                  <span>{t.label}</span>
                  <b className={n[t.key] === 0 ? 'is-zero' : undefined}>{shown(n[t.key])}</b>
                </a>
              </li>
            ))}
          </ul>
        </div>
        {CASES.map((t) => (
          <a key={t.key} className="ae-card" href={listHref(t)}>
            <h3>{t.label}</h3>
            <span className={`ae-num${n[t.key] === 0 ? ' is-zero' : ''}`}>{shown(n[t.key])}</span>
          </a>
        ))}
        <Link prefetch={false} className="ae-card" href="/admin/validation">
          <span className="ae-act"><IconCheck />Validation</span>
          <small>Tout ce qui attend un clic, en une liste : publier, rejeter, activer.</small>
        </Link>
        <Link prefetch={false} className="ae-card" href="/admin/import">
          <span className="ae-act"><IconImport />Importer des adresses</span>
          <small>Fichier CSV : simulation d’abord, puis création en brouillon.</small>
        </Link>
        <Link prefetch={false} className="ae-card" href="/admin/controle">
          <span className="ae-act"><IconShield />Contrôle de sécurité</span>
          <small>Fiches incomplètes, doublons, photos, sauvegarde, réglages.</small>
        </Link>
        <details className="ae-card ae-help">
          <summary className="ae-act"><IconHelp />Aide</summary>
          <ol>
            <li>Ouvrez une case « À relire », vérifiez la fiche, puis cliquez « Publier ».</li>
            <li>Une photo envoyée par un compte : regardez-la, puis passez-la à « Contrôlée ».</li>
            <li>Un doute : laissez en brouillon et écrivez à salam@mydalil.com.</li>
          </ol>
        </details>
      </div>
    </section>
  )
}
