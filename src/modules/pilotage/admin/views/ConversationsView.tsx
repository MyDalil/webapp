import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { TextAct } from './Act'
import { CockpitPage, fmtDate, Head, Section } from './CockpitPage'

type Row = Record<string, unknown> & { id: number }

/** Échanges entre l’équipe et les agents, et entre agents, groupés par tâche. Directive directe à un agent. */
export function ConversationsView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} render={async ({ req, tr, lang }) => {
      const p = req.payload
      const [msgs, agents] = await Promise.all([
        p.find({ collection: 'agent-messages', req, overrideAccess: false, depth: 0, limit: 150, sort: '-createdAt' }),
        p.find({ collection: 'agents', req, overrideAccess: false, depth: 0, limit: 100, where: { status: { not_equals: 'reserve' } }, select: { name: true } as never }),
      ])
      const name = new Map((agents.docs as unknown as Row[]).map((a) => [a.id, String(a.name)]))
      const groups = new Map<string, Row[]>()
      for (const m of msgs.docs as unknown as Row[]) {
        const k = m.task ? `t${m.task}` : 'libre'
        if (!groups.has(k)) groups.set(k, [])
        groups.get(k)!.push(m)
      }
      return (
        <>
          <Head title={tr('nav.conversations', 'Conversations')} sub={tr('conv.sub', 'L’auteur de chaque message vient de la session : un agent ne parle jamais au nom de Saïd.')} />
          <Section id="dir" title={tr('conv.directive', 'Directive à un agent')} sub={tr('conv.directive.sub', 'L’agent la lit au début de sa prochaine étape.')}>
            {(agents.docs as unknown as Row[]).length === 0 ? <p className="dl-empty">{tr('pv.agents.none', 'Aucun agent enregistré pour l’instant.')}</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                {(agents.docs as unknown as Row[]).map((a) => (
                  <div key={a.id}><b style={{ fontSize: 13 }}>{String(a.name)}</b><TextAct path="/api/agent-messages" method="POST" field="body" extra={{ toAgent: a.id, kind: 'directive', channel: 'admin' }} label={tr('conv.send', 'Envoyer')} placeholder={tr('conv.ph', 'Votre consigne')} /></div>
                ))}
              </div>
            )}
          </Section>
          {groups.size === 0 ? <p className="dl-card dl-empty">{tr('conv.none', 'Aucun message pour le moment.')}</p> : [...groups.entries()].map(([k, list]) => (
            <section key={k} className="dl-card" aria-label={k}>
              <div className="dl-row dl-sb"><h2 style={{ margin: 0 }}>{k === 'libre' ? tr('conv.free', 'Hors tâche') : <Link href={`/admin/collections/agent-tasks/${k.slice(1)}`}>{tr('act.task', 'Tâche')} #{k.slice(1)}</Link>}</h2><span className="dl-pill">{list.length}</span></div>
              <ol style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 8 }}>
                {[...list].reverse().map((m) => (
                  <li key={m.id} className={m.fromKind === 'agent' ? 'dl-msg dl-msg-agent' : 'dl-msg'}>
                    <div className="dl-row dl-wr" style={{ gap: 6, fontSize: 12 }}>
                      <b>{String(m.fromLabel ?? m.fromKind ?? '')}</b>
                      <span className="dl-mu">→ {m.toAgent ? name.get(Number(m.toAgent)) ?? `#${m.toAgent}` : tr(`to.${String(m.toHuman ?? 'equipe')}`, String(m.toHuman ?? 'équipe'))}</span>
                      {m.kind ? <span className="dl-pill">{tr(`kind.${String(m.kind)}`, String(m.kind))}</span> : null}
                      <span className="dl-mu">· {fmtDate(lang, m.createdAt)}{m.channel ? ` · ${String(m.channel)}` : ''}</span>
                    </div>
                    <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{String(m.body)}</p>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </>
      )
    }} />
  )
}
