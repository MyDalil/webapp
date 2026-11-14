import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { Act } from './Act'
import { CockpitPage, fmtDate, Head, Section, STATUS_PILL, usd } from './CockpitPage'
import { NewTaskForm } from './Forms'

type Row = Record<string, unknown> & { id: number }
const COLUMNS = ['new', 'running', 'paused', 'review', 'done', 'failed'] as const
const weekAgo = () => new Date(Date.now() - 7 * 86_400_000).toISOString()
const PRIO: Record<string, string> = { urgent: 'dl-pill da', high: 'dl-pill wa', normal: 'dl-pill', low: 'dl-pill' }

/** Tâches des agents en colonnes (kanban). Les terminées : 7 derniers jours. */
export function TachesView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} roles={['patron', 'admin', 'editor']} render={async ({ req, tr, lang }) => {
      const p = req.payload
      const week = weekAgo()
      const [tasks, agents] = await Promise.all([
        p.find({ collection: 'agent-tasks', req, overrideAccess: false, depth: 0, limit: 300, sort: '-updatedAt', where: { or: [{ status: { not_in: ['done', 'cancelled'] } }, { updatedAt: { greater_than_equal: week } }] } }),
        p.find({ collection: 'agents', req, overrideAccess: false, depth: 0, limit: 100, where: { status: { not_equals: 'reserve' } }, select: { name: true, slug: true } as never }),
      ])
      const name = new Map((agents.docs as unknown as Row[]).map((a) => [a.id, String(a.name)]))
      const byCol = new Map<string, Row[]>(COLUMNS.map((c) => [c, []]))
      for (const t of tasks.docs as unknown as Row[]) byCol.get(String(t.status))?.push(t)
      const st = (s: string) => tr(`status.${s}`, s)
      return (
        <>
          <Head title={tr('nav.taches', 'Tâches')} sub={tr('taches.sub', 'Chaque tâche avance par étapes. Un agent ne publie rien seul : il propose, l’équipe valide.')}>
            <Link className="dl-btn" href="/admin/collections/agent-tasks">{tr('ui.table', 'Vue tableau')}</Link>
          </Head>
          <Section id="new" title={tr('taches.new', 'Nouvelle tâche')} sub={tr('taches.new.sub', 'Sans agent choisi, le CEO répartit le travail. Aussi par Telegram : un message libre crée une tâche.')}>
            <NewTaskForm agents={(agents.docs as unknown as Row[]).map((a) => ({ value: String(a.id), label: String(a.name) }))} labels={{ form: tr('taches.new', 'Nouvelle tâche'), title: tr('taches.f.title', 'Titre de la tâche'), instructions: tr('taches.f.instr', 'Consignes : quoi, où, pour quand, quelles sources'), agent: tr('taches.f.agent', 'Agent'), ceo: tr('taches.f.ceo', 'Le CEO choisit'), priority: tr('taches.f.prio', 'Priorité'), send: tr('taches.f.send', 'Créer la tâche'), 'prio.low': tr('prio.low', 'Basse'), 'prio.normal': tr('prio.normal', 'Normale'), 'prio.high': tr('prio.high', 'Haute'), 'prio.urgent': tr('prio.urgent', 'Urgente') }} />
          </Section>
          <div className="dl-kanban" role="list" aria-label={tr('nav.taches', 'Tâches')}>
            {COLUMNS.map((c) => {
              const list = byCol.get(c) ?? []
              return (
                <section key={c} className="dl-col" role="listitem" aria-label={st(c)}>
                  <div className="dl-row dl-sb"><b>{st(c)}</b><span className="dl-pill">{list.length}</span></div>
                  {list.length === 0 ? <p className="dl-mu" style={{ fontSize: 12.5 }}>{tr('taches.empty', 'Vide.')}</p> : list.slice(0, 40).map((t) => (
                    <article key={t.id} className="dl-card dl-task">
                      <Link href={`/admin/collections/agent-tasks/${t.id}`} style={{ color: 'inherit', fontWeight: 600 }}>#{t.id} {String(t.title)}</Link>
                      <div className="dl-row dl-wr" style={{ gap: 6, fontSize: 12 }}>
                        <span className={PRIO[String(t.priority)] ?? 'dl-pill'}>{tr(`prio.${String(t.priority ?? 'normal')}`, String(t.priority ?? 'normal'))}</span>
                        <span className="dl-mu">{t.agent ? name.get(Number(t.agent)) ?? `#${t.agent}` : 'CEO'}</span>
                        <span className="dl-mu">· {fmtDate(lang, t.updatedAt)}</span>
                      </div>
                      <div className="dl-mu" style={{ fontSize: 12 }}>{tr('agents.step', 'étape')} {String(t.steps ?? 0)}{t.stage ? ` · ${String(t.stage)}` : ''} · {usd(t.spentMicros)}</div>
                      {t.error ? <div role="alert" style={{ color: 'var(--dl-da)', fontSize: 12 }}>{String(t.error)}</div> : null}
                      <div className="dl-row dl-wr" style={{ gap: 6 }}>
                        {c === 'review' ? <Link className="dl-btn pri" href={`/admin/cockpit/validation#t${t.id}`}>{tr('taches.review', 'Examiner')}</Link> : null}
                        {c === 'new' || c === 'running' ? <Act path={`/api/agent-tasks/${t.id}`} body={{ status: 'paused' }} label={tr('agents.pause', 'Mettre en pause')} /> : null}
                        {c === 'paused' ? <Act path={`/api/agent-tasks/${t.id}`} body={{ status: 'running' }} label={tr('agents.resume', 'Reprendre')} /> : null}
                        {c === 'failed' ? <Act path={`/api/agent-tasks/${t.id}`} body={{ status: 'new', error: null, steps: 0, spentMicros: 0 }} label={tr('taches.retry', 'Relancer (compteurs à zéro)')} /> : null}
                        {c !== 'done' ? <Act path={`/api/agent-tasks/${t.id}`} body={{ status: 'cancelled' }} label={tr('taches.cancel', 'Annuler')} confirm={tr('taches.cancel.confirm', 'Annuler cette tâche ?')} /> : null}
                      </div>
                    </article>
                  ))}
                </section>
              )
            })}
          </div>
          <p className="dl-mu" style={{ fontSize: 12.5 }}><span className={STATUS_PILL.cancelled}>{st('cancelled')}</span> {tr('taches.cancelled', 'Les tâches annulées restent dans la vue tableau.')}</p>
        </>
      )
    }} />
  )
}
