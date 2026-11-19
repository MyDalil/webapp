import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps, Payload } from 'payload'
import { isTeam } from './accueil'
import { ADMIN_CSS } from './styles'
import { ValidationActions } from './ValidationActions'
import { QUEUES, itemTitle, opLabel, type Queue } from './validation'

const PER_QUEUE = 25

type Row = { q: Queue; id: number; title: string; updatedAt: string | null }

async function load(payload: Payload, q: Queue): Promise<{ rows: Row[]; total: number | null }> {
  try {
    const r = await payload.find({ collection: q.collection as never, where: q.where as never, sort: '-updatedAt', limit: PER_QUEUE, depth: 0, overrideAccess: true })
    return { rows: r.docs.map((d) => ({ q, id: Number((d as { id: unknown }).id), title: itemTitle(q.key, d as unknown as Record<string, unknown>), updatedAt: ((d as { updatedAt?: string }).updatedAt ?? null) })), total: r.totalDocs }
  } catch {
    return { rows: [], total: null }
  }
}

const day = (s: string | null) => (s ? new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Africa/Algiers' }) : '')

/**
 * Vue admin « Validation » (chemin `/validation`) : une seule liste de tout ce qui attend un clic (brouillons et fiches
 * en attente, revendications, abonnements, paiements, contributions). Lecture : équipe ; boutons : patron et admin,
 * qui passent par les actions du registre (canal « admin ») via /api/validation.
 */
export async function ValidationView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  const user = req.user as { collection?: string; role?: string } | null
  if (!user || user.collection !== 'users') redirect('/admin/login')
  const allowed = isTeam(req.user)
  const canAct = ['patron', 'admin'].includes(String(user.role))
  const loaded = allowed ? await Promise.all(QUEUES.map((q) => load(req.payload, q))) : []
  const rows = loaded.flatMap((l) => l.rows).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
  const failed = loaded.filter((l) => l.total == null).length
  const hidden = loaded.reduce((s, l) => s + Math.max(0, (l.total ?? 0) - l.rows.length), 0)
  return (
    <DefaultTemplate i18n={req.i18n} locale={locale} params={params} payload={req.payload} permissions={permissions} req={req} searchParams={searchParams} user={req.user ?? undefined} visibleEntities={visibleEntities}>
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <div className="gutter--left gutter--right" style={{ paddingTop: 'calc(var(--base) * 2)', paddingBottom: 'calc(var(--base) * 3)', maxWidth: 1000 }}>
        <h1>Validation</h1>
        {!allowed ? (
          <p>Accès réservé à l’équipe.</p>
        ) : (
          <>
            <p style={{ color: 'var(--theme-elevation-600)', marginBottom: 'var(--base)' }}>
              {rows.length ? `${rows.length + hidden} élément(s) en attente.` : 'Rien en attente.'} Rien n’est publié ni activé sans votre clic.
              {canAct ? '' : ' Les boutons sont réservés au patron et aux administrateurs.'}
              {failed ? ` ${failed} liste(s) illisible(s) : rechargez la page.` : ''}
              {hidden ? ` Les ${PER_QUEUE} plus récents par type sont affichés.` : ''}
            </p>
            {rows.length ? (
              <ul className="ct-list vl-list">
                {rows.map((r) => (
                  <li key={`${r.q.key}-${r.id}`}>
                    <div className="ct-row">
                      <span className="vl-what">
                        <small className="vl-kind">{r.q.label}</small>
                        <a href={`/admin/collections/${r.q.collection}/${r.id}`}>{r.title}</a>
                        {r.updatedAt ? <small className="vl-date">{day(r.updatedAt)}</small> : null}
                      </span>
                      {canAct && r.q.ops.length ? (
                        <ValidationActions kind={r.q.key} id={r.id} ops={r.q.ops.map((op) => ({ op, label: opLabel(r.q, op) }))} withNote={r.q.key !== 'places'} />
                      ) : (
                        <a className="vl-open" href={`/admin/collections/${r.q.collection}/${r.id}`}>Ouvrir</a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </DefaultTemplate>
  )
}
