import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { Act, TextAct } from './Act'
import { CockpitPage, fmtDate, Head, usd } from './CockpitPage'

type Row = Record<string, unknown> & { id: number }
type TraceLine = { step?: number; stage?: string; kind?: string; tool?: string; detail?: string; actionId?: string }

/** Travail des agents en attente d’une décision humaine : rapport, proposition, trace. */
export function ValidationView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} render={async ({ req, tr, lang }) => {
      const p = req.payload
      const [tasks, agents] = await Promise.all([
        p.find({ collection: 'agent-tasks', req, overrideAccess: false, depth: 0, limit: 50, sort: 'updatedAt', where: { status: { equals: 'review' } } }),
        p.find({ collection: 'agents', req, overrideAccess: false, depth: 0, limit: 100, select: { name: true } as never }),
      ])
      const name = new Map((agents.docs as unknown as Row[]).map((a) => [a.id, String(a.name)]))
      const list = tasks.docs as unknown as Row[]
      return (
        <>
          <Head title={tr('nav.validation', 'Validation')} sub={tr('val.sub', 'Valider clôt la tâche. Rejeter l’annule. Une consigne la relance avec votre correction.')} />
          {list.length === 0 ? <p className="dl-card dl-empty">{tr('pv.review.none', 'Rien n’attend de validation.')}</p> : list.map((t) => {
            const items = ((t.proposal as { items?: unknown[] } | null)?.items ?? (t.proposal ? [t.proposal] : [])) as unknown[]
            const trace = (Array.isArray(t.trace) ? t.trace : []) as TraceLine[]
            return (
              <article key={t.id} id={`t${t.id}`} className="dl-card" style={{ display: 'grid', gap: 12 }} aria-label={String(t.title)}>
                <div className="dl-row dl-sb dl-wr">
                  <div><h2 style={{ margin: 0 }}>#{t.id} {String(t.title)}</h2><span className="dl-mu" style={{ fontSize: 12.5 }}>{t.agent ? name.get(Number(t.agent)) : 'CEO'} · {fmtDate(lang, t.updatedAt)} · {tr('agents.step', 'étape')} {String(t.steps ?? 0)} · {usd(t.spentMicros)}</span></div>
                  <Link className="dl-btn" href={`/admin/collections/agent-tasks/${t.id}`}>{tr('val.open', 'Ouvrir la fiche')}</Link>
                </div>
                <div>
                  <b style={{ fontSize: 13 }}>{tr('val.report', 'Rapport de l’agent')}</b>
                  <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{String(t.result ?? '') || <span className="dl-mu">{tr('val.noreport', 'Aucun rapport.')}</span>}</p>
                </div>
                <div>
                  <b style={{ fontSize: 13 }}>{tr('val.proposal', 'Proposition')} · {items.length}</b>
                  {items.length === 0 ? <p className="dl-mu" style={{ margin: '6px 0 0' }}>{tr('val.noproposal', 'Aucune modification proposée.')}</p> : (
                    <ol style={{ margin: '6px 0 0', paddingInlineStart: 18, display: 'grid', gap: 6 }}>
                      {items.map((it, i) => <li key={i}><pre className="dl-pre">{JSON.stringify(it, null, 2)}</pre></li>)}
                    </ol>
                  )}
                  <p className="dl-mu" style={{ fontSize: 12, margin: '6px 0 0' }}>{tr('val.manual', 'La proposition n’est jamais appliquée automatiquement : vous la reportez sur la fiche concernée.')}</p>
                </div>
                {trace.length ? (
                  <details>
                    <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>{tr('val.trace', 'Trace des étapes')} · {trace.length}</summary>
                    <ul style={{ margin: '6px 0 0', paddingInlineStart: 18, fontSize: 12.5 }}>
                      {trace.map((l, i) => <li key={i}>{tr('agents.step', 'étape')} {l.step ?? '?'}{l.stage ? ` · ${l.stage}` : ''} · <b>{tr(`trace.${l.kind ?? ''}`, l.kind ?? '')}</b>{l.tool ? ` · ${l.tool}` : ''}{l.actionId ? <> · <code>{l.actionId}</code></> : null}{l.detail ? ` — ${l.detail.slice(0, 300)}` : ''}</li>)}
                    </ul>
                  </details>
                ) : null}
                <div className="dl-row dl-wr" style={{ gap: 8 }}>
                  <Act path={`/api/agent-tasks/${t.id}`} body={{ status: 'done' }} label={tr('val.approve', 'Valider')} className="dl-btn pri" />
                  <Act path={`/api/agent-tasks/${t.id}`} body={{ status: 'cancelled' }} label={tr('val.reject', 'Rejeter')} confirm={tr('val.reject.confirm', 'Rejeter et annuler cette tâche ?')} />
                </div>
                <TextAct path={`/api/agent-tasks/${t.id}`} field="directive" extra={{ status: 'new', steps: 0, spentMicros: 0, error: null }} label={tr('val.redo', 'Relancer')} placeholder={tr('val.redo.ph', 'Consigne de correction pour l’agent')} />
              </article>
            )
          })}
        </>
      )
    }} />
  )
}
