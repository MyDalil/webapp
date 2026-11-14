import Link from 'next/link'
import type { AdminViewServerProps, Where } from 'payload'
import { CockpitPage, fmtDate, Head, STATUS_PILL } from './CockpitPage'

type Row = Record<string, unknown> & { id: number }
type Attachment = { label?: string; href?: string }
const PHASES = ['before', 'during', 'after', 'order'] as const

/** Fil d’activité : chaque notification des agents (avant, pendant, après, ordre), avec son identifiant d’action et le travail joint. */
export function ActiviteView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} render={async ({ req, tr, lang }) => {
      const sp = (props.searchParams ?? {}) as Record<string, string | string[] | undefined>
      const phase = PHASES.find((x) => x === sp.phase)
      const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 80) : ''
      const and: Where[] = []
      if (phase) and.push({ phase: { equals: phase } })
      if (q) and.push({ or: [{ actionId: { equals: q } }, { title: { like: q } }, { agentLabel: { like: q } }] })
      const res = await req.payload.find({ collection: 'agent-notifications', req, overrideAccess: false, depth: 0, limit: 100, sort: '-createdAt', where: and.length ? { and } : undefined })
      const list = res.docs as unknown as Row[]
      const ph = (s: string) => tr(`phase.${s}`, s)
      return (
        <>
          <Head title={tr('nav.activite', 'Fil d’activité')} sub={tr('pv.feed.sub', 'Avant, pendant et après chaque action des agents, avec son identifiant.')} />
          <form className="dl-card dl-row dl-wr" style={{ gap: 8 }} role="search" action="/admin/cockpit/activite">
            <input className="dl-inp" name="q" defaultValue={q} placeholder={tr('act.search', 'act_… , agent ou titre')} aria-label={tr('act.search', 'act_… , agent ou titre')} style={{ flex: '1 1 220px' }} />
            <select className="dl-inp" name="phase" defaultValue={phase ?? ''} aria-label={tr('notify.moment', 'Moment')}>
              <option value="">{tr('act.all', 'Tous les moments')}</option>
              {PHASES.map((x) => <option key={x} value={x}>{ph(x)}</option>)}
            </select>
            <button className="dl-btn pri" type="submit">{tr('act.filter', 'Filtrer')}</button>
          </form>
          <section className="dl-card" aria-label={tr('nav.activite', 'Fil d’activité')}>
            {list.length === 0 ? <p className="dl-empty">{tr('pv.feed.none', 'Aucune activité d’agent pour le moment.')}</p> : (
              <ol className="dl-feed" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {list.map((n) => {
                  const att = (Array.isArray(n.attachments) ? n.attachments : []) as Attachment[]
                  const del = (n.delivery ?? {}) as Record<string, string>
                  return (
                    <li key={n.id} style={{ display: 'grid', gap: 4, padding: '10px 0', borderBottom: '1px solid var(--dl-ln)' }}>
                      <div className="dl-row dl-wr" style={{ gap: 8 }}>
                        <span className={STATUS_PILL[String(n.phase)] ?? 'dl-pill'}>{ph(String(n.phase))}</span>
                        <b>{String(n.title)}</b>
                        <span className="dl-mu" style={{ fontSize: 12 }}>{String(n.agentLabel ?? '')} · {fmtDate(lang, n.createdAt)}</span>
                      </div>
                      {n.body ? <p className="dl-mu" style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>{String(n.body)}</p> : null}
                      <div className="dl-row dl-wr" style={{ gap: 8, fontSize: 12 }}>
                        {n.actionId ? <Link href={`/admin/cockpit/activite?q=${String(n.actionId)}`}><code>{String(n.actionId)}</code></Link> : null}
                        {n.task ? <Link href={`/admin/collections/agent-tasks/${String(n.task)}`}>{tr('act.task', 'Tâche')} #{String(n.task)}</Link> : null}
                        {att.filter((a) => a.href).map((a, i) => <Link key={i} href={String(a.href)}>{a.label ?? a.href}</Link>)}
                        {Object.entries(del).map(([k, v]) => <span key={k} className={v === 'accepté' ? 'dl-pill ok' : v === 'échec' ? 'dl-pill da' : 'dl-pill'}>{k} : {tr(`delivery.${v}`, v)}</span>)}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </>
      )
    }} />
  )
}
