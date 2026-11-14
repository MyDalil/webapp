import type { AdminViewServerProps } from 'payload'
import { listRoles } from '@/modules/agents'
import { CockpitPage, Head } from './CockpitPage'
import { FieldEditor } from './Forms'

type Row = Record<string, unknown> & { id: number }

/**
 * Mémoire et skills : la mémoire résumée (base, modifiable ici) et les règles du rôle (dépôt company/, lecture seule).
 * Les règles changent par un commit relu, jamais en silence (règle racine « Mémoire et apprentissage »).
 */
export function MemoireView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} render={async ({ req, tr }) => {
      const [agents, roles] = await Promise.all([
        req.payload.find({ collection: 'agents', req, overrideAccess: false, depth: 0, limit: 100, sort: 'department' }),
        listRoles().catch(() => []),
      ])
      const roleOf = new Map(roles.map((r) => [r.id.slug, r]))
      return (
        <>
          <Head title={tr('nav.memoire', 'Mémoire et skills')} sub={tr('mem.sub', 'La mémoire résumée se corrige ici. Les règles, garde-fous et étapes vivent dans le dépôt : ils changent par un commit relu.')} />
          {(agents.docs as unknown as Row[]).map((a) => {
            const r = roleOf.get(String(a.slug)) ?? roleOf.get(String(a.roleId ?? ''))
            return (
              <article key={a.id} id={String(a.slug)} className="dl-card" style={{ display: 'grid', gap: 10 }} aria-label={String(a.name)}>
                <div className="dl-row dl-sb dl-wr"><h2 style={{ margin: 0 }}>{String(a.name)}</h2><code className="dl-mu" style={{ fontSize: 12 }}>{r ? r.dir.replace(/^.*?company\//, 'company/') : String(a.slug)}</code></div>
                <FieldEditor path={`/api/agents/${a.id}`} field="memory" value={String(a.memory ?? '')} label={`${tr('mem.memory', 'Mémoire résumée')} — ${String(a.name)}`} save={tr('ui.save', 'Enregistrer')} />
                {r ? (
                  <>
                    <div className="dl-row dl-wr" style={{ gap: 6, fontSize: 12.5 }}>
                      <b>{tr('mem.guard', 'Garde-fous')} :</b>
                      {r.guardrails.execute.map((x) => <span key={`e${x}`} className="dl-pill ok">{x} · {tr('mode.execute', 'Exécute')}</span>)}
                      {r.guardrails.propose.map((x) => <span key={`p${x}`} className="dl-pill wa">{x} · {tr('mode.propose', 'Propose')}</span>)}
                      {r.guardrails.forbidden.map((x) => <span key={`f${x}`} className="dl-pill da">{x} · {tr('mode.forbidden', 'Interdit')}</span>)}
                      <span className="dl-mu">· {r.guardrails.max_steps} {tr('mem.steps', 'étapes max')} · {r.guardrails.budget_usd_per_task} $ / {tr('act.task', 'Tâche').toLowerCase()}</span>
                    </div>
                    <div className="dl-row dl-wr" style={{ gap: 6, fontSize: 12.5 }}><b>{tr('mem.workflows', 'Workflows')} :</b>{r.id.workflows.length ? r.id.workflows.map((w) => <code key={w} className="dl-pill">{w}</code>) : <span className="dl-mu">—</span>}</div>
                    <details><summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>AGENT.md</summary><pre className="dl-pre">{r.agentMd}</pre></details>
                  </>
                ) : <p className="dl-mu" style={{ margin: 0 }}>{tr('mem.norole', 'Aucun dossier de rôle trouvé dans company/.')}</p>}
              </article>
            )
          })}
        </>
      )
    }} />
  )
}
