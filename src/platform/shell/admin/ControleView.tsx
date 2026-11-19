import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { securityReport } from '@/platform/ops/security'
import { controleLignes, isTeam } from './accueil'
import { ADMIN_CSS } from './styles'

/**
 * Vue admin « Contrôle de sécurité » (à enregistrer en `admin.components.views.controle`, chemin `/controle`).
 * Même rapport que l’action `controle_securite` (lecture seule, aucune valeur secrète), en phrases simples.
 */
export async function ControleView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  const user = req.user as { collection?: string } | null
  if (!user || user.collection !== 'users') redirect('/admin/login')
  const allowed = isTeam(req.user)
  const lignes = allowed ? controleLignes((await securityReport(req.payload)) as unknown as Record<string, unknown>) : []
  const alertes = lignes.filter((l) => l.alerte).length
  return (
    <DefaultTemplate i18n={req.i18n} locale={locale} params={params} payload={req.payload} permissions={permissions} req={req} searchParams={searchParams} user={req.user ?? undefined} visibleEntities={visibleEntities}>
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <div className="gutter--left gutter--right" style={{ paddingTop: 'calc(var(--base) * 2)', paddingBottom: 'calc(var(--base) * 3)', maxWidth: 900 }}>
        <h1>Contrôle de sécurité</h1>
        {!allowed ? (
          <p>Accès réservé à l’équipe.</p>
        ) : (
          <>
            <p style={{ color: 'var(--theme-elevation-600)', marginBottom: 'var(--base)' }}>
              {alertes ? `${alertes} point(s) à regarder.` : 'Tout est en ordre.'} Lecture seule : ce rapport ne modifie rien. Rechargez la page pour le refaire.
            </p>
            <ul className="ct-list">
              {lignes.map((l) => (
                <li key={l.label}>
                  <div className="ct-row">
                    <span><i className={`ct-dot${l.alerte ? ' is-alert' : ''}`} aria-hidden="true" />{l.label}</span>
                    <b>{l.valeur}{l.alerte ? <span className="ct-sr"> (à regarder)</span> : null}</b>
                  </div>
                  {l.exemples?.length ? (
                    <details>
                      <summary>Voir le détail ({l.exemples.length})</summary>
                      <ul>{l.exemples.map((e, i) => <li key={i}>{e}</li>)}</ul>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </DefaultTemplate>
  )
}
