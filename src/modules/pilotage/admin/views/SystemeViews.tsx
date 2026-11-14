import { sql } from '@payloadcms/db-postgres'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { MONTHLY_BUDGET_MICROS } from '@/platform/ai/budget'
import { Act } from './Act'
import { CockpitPage, fmtDate, Head, Section, usd } from './CockpitPage'

type Row = Record<string, unknown> & { id: number }
type Db = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
const days = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString() }
const now = () => Date.now()

/** Barres horizontales accessibles : la valeur est écrite, la barre n’est qu’un repère. */
function Bars({ rows, fmt = String, label }: { rows: Array<[string, number]>; fmt?: (n: number) => string; label: string }) {
  const max = Math.max(1, ...rows.map(([, v]) => v))
  if (!rows.length) return <p className="dl-empty">—</p>
  return (
    <ul className="dl-bars" aria-label={label}>
      {rows.map(([k, v]) => (
        <li key={k}><span className="dl-bars-k">{k}</span><span className="dl-meter"><span style={{ width: `${(v / max) * 100}%` }} /></span><span className="dl-bars-v">{fmt(v)}</span></li>
      ))}
    </ul>
  )
}

const sumBy = <T,>(xs: T[], key: (x: T) => string, val: (x: T) => number) => {
  const m = new Map<string, number>()
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + val(x))
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

/** IA et coûts : dépense du mois par usage, agent et modèle ; 30 derniers jours ; plafonds. */
export function IaView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} render={async ({ req, tr }) => {
      const p = req.payload
      const [usage, agents, controls] = await Promise.all([
        p.find({ collection: 'ai-usage', req, overrideAccess: false, depth: 0, pagination: false, select: { feature: true, agent: true, model: true, costMicros: true, createdAt: true } as never, where: { createdAt: { greater_than_equal: days(31) } } }),
        p.find({ collection: 'agents', req, overrideAccess: false, depth: 0, limit: 100, select: { name: true } as never }),
        p.findGlobal({ slug: 'controls', req, overrideAccess: false, depth: 0 }) as unknown as Promise<Record<string, unknown>>,
      ])
      const name = new Map((agents.docs as unknown as Row[]).map((a) => [a.id, String(a.name)]))
      const all = usage.docs as unknown as Array<Row & { feature: string; agent?: number; model?: string; costMicros?: number; createdAt: string }>
      const month = all.filter((u) => u.createdAt >= monthStart())
      const cost = (u: { costMicros?: number }) => Number(u.costMicros) || 0
      const monthTotal = month.reduce((n, u) => n + cost(u), 0)
      const agentsMonth = month.filter((u) => u.feature === 'agent').reduce((n, u) => n + cost(u), 0)
      const agentBudget = (controls.agentsMonthlyBudgetUsd as number | null) ?? null
      const perDay = sumBy(all, (u) => u.createdAt.slice(0, 10), cost).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 30)
      return (
        <>
          <Head title={tr('nav.ia', 'IA et coûts')} sub={tr('ia.sub', 'Chaque appel est compté (modèle, jetons, coût). Les plafonds coupent l’IA avant tout dépassement.')} />
          <div className="dl-kpis">
            <div className="dl-card dl-kpi"><div><div className="dl-v">{usd(monthTotal)}</div><div className="dl-kl">{tr('ia.month', 'Dépensé ce mois')}</div></div></div>
            <div className="dl-card dl-kpi"><div><div className="dl-v">{usd(agentsMonth)}</div><div className="dl-kl">{tr('ia.agents', 'Agents')} · {agentBudget == null ? tr('ia.nobudget', 'aucun budget : aucun agent ne travaille') : `${tr('ia.cap', 'plafond')} ${agentBudget} $`}</div></div></div>
            <div className="dl-card dl-kpi"><div><div className="dl-v">{usd(MONTHLY_BUDGET_MICROS)}</div><div className="dl-kl">{tr('ia.members', 'Plafond IA des membres (AI_MONTHLY_BUDGET_USD)')}</div></div></div>
            <div className="dl-card dl-kpi"><div><div className="dl-v">{month.length}</div><div className="dl-kl">{tr('ia.calls', 'Appels ce mois')}</div></div></div>
          </div>
          <div className="dl-cols">
            <Section id="feat" title={tr('ia.byFeature', 'Par usage (mois)')}><Bars label={tr('ia.byFeature', 'Par usage (mois)')} rows={sumBy(month, (u) => tr(`ia.f.${u.feature}`, u.feature), cost)} fmt={usd} /></Section>
            <Section id="agent" title={tr('ia.byAgent', 'Par agent (mois)')}><Bars label={tr('ia.byAgent', 'Par agent (mois)')} rows={sumBy(month.filter((u) => u.feature === 'agent'), (u) => name.get(Number(u.agent)) ?? `#${u.agent ?? '?'}`, cost)} fmt={usd} /></Section>
            <Section id="model" title={tr('ia.byModel', 'Par modèle (mois)')}><Bars label={tr('ia.byModel', 'Par modèle (mois)')} rows={sumBy(month, (u) => u.model ?? '?', cost)} fmt={usd} /></Section>
            <Section id="days" title={tr('ia.days', '30 derniers jours')}><Bars label={tr('ia.days', '30 derniers jours')} rows={perDay} fmt={usd} /></Section>
          </div>
          <Section id="keys" title={tr('ia.keys', 'Clés et réglages')} sub={tr('ia.keys.sub', 'Présence seulement ; les valeurs restent dans Vercel.')}>
            <div className="dl-row dl-wr" style={{ gap: 6 }}>
              {['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'].map((k) => <span key={k} className={process.env[k] ? 'dl-pill ok' : 'dl-pill wa'}>{k} : {process.env[k] ? tr('con.ok', 'Configuré') : tr('con.missing', 'À configurer')}</span>)}
              <Link className="dl-btn" href="/admin/cockpit/agents#ks">{tr('ia.toControls', 'Budget des agents')}</Link>
            </div>
          </Section>
        </>
      )
    }} />
  )
}

/** Santé technique : base, version, tâches planifiées, sauvegarde, erreurs, emails. */
export function SanteView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} render={async ({ req, tr, lang }) => {
      const p = req.payload
      const t0 = now()
      const dbOk = await (p.db as unknown as Db).drizzle.execute(sql`SELECT 1`).then(() => true, () => false)
      const dbMs = now() - t0
      const [runs, errors, mails] = await Promise.all([
        p.find({ collection: 'task-runs', req, overrideAccess: false, depth: 0, limit: 300, sort: '-startedAt', where: { startedAt: { greater_than_equal: days(14) } } }).catch(() => ({ docs: [] })),
        p.find({ collection: 'error-logs', req, overrideAccess: false, depth: 0, limit: 15, sort: '-lastSeen', where: { resolved: { not_equals: true } } }).catch(() => ({ docs: [] })),
        p.find({ collection: 'email-deliveries', req, overrideAccess: false, depth: 0, pagination: false, select: { status: true } as never, where: { createdAt: { greater_than_equal: days(7) } } }).catch(() => ({ docs: [] })),
      ])
      const last = new Map<string, Row>()
      for (const r of runs.docs as unknown as Row[]) if (!last.has(String(r.name ?? r.key))) last.set(String(r.name ?? r.key), r)
      const backup = (runs.docs as unknown as Row[]).find((r) => String(r.name ?? r.key).startsWith('sauvegarde') && r.status === 'succeeded')
      const backupAge = backup ? Math.round((now() - Date.parse(String(backup.finishedAt ?? backup.startedAt))) / 36e5) : null
      return (
        <>
          <Head title={tr('nav.sante', 'Santé technique')} sub={tr('sante.sub', 'État vérifié à l’ouverture de cette page. La surveillance horaire alerte par email en cas de panne.')} />
          <div className="dl-kpis">
            <div className="dl-card dl-kpi"><div><div className="dl-v">{dbOk ? `${dbMs} ms` : '✕'}</div><div className="dl-kl">{tr('sante.db', 'Base Neon')} · {dbOk ? tr('sante.ok', 'répond') : tr('sante.down', 'indisponible')}</div></div></div>
            <div className="dl-card dl-kpi"><div><div className="dl-v">{backupAge == null ? '—' : `${backupAge} h`}</div><div className="dl-kl">{tr('sante.backup', 'Dernière sauvegarde réussie')}{backupAge != null && backupAge > 36 ? ` · ${tr('sante.late', 'en retard')}` : ''}</div></div></div>
            <div className="dl-card dl-kpi"><div><div className="dl-v">{errors.docs.length}</div><div className="dl-kl">{tr('kpi.erreurs', 'Erreurs non résolues')}</div></div></div>
            <div className="dl-card dl-kpi"><div><div className="dl-v">{process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local'}</div><div className="dl-kl">{tr('sante.version', 'Version')} · {process.env.VERCEL_ENV ?? 'local'}</div></div></div>
          </div>
          <Section id="tasks" title={tr('sante.tasks', 'Tâches planifiées (dernier passage)')} action={<Link href="/admin/collections/task-runs" style={{ fontSize: 12.5 }}>{tr('pv.all', 'Tout voir')}</Link>}>
            {last.size === 0 ? <p className="dl-empty">{tr('sante.notasks', 'Aucun passage depuis 14 jours.')}</p> : (
              <div className="dl-scroll"><table style={{ minWidth: 520 }}><thead><tr><th>{tr('sante.task', 'Tâche')}</th><th>{tr('hist.state', 'État')}</th><th>{tr('hist.date', 'Date')}</th><th>{tr('sante.duration', 'Durée')}</th></tr></thead><tbody>
                {[...last.entries()].map(([k, r]) => (
                  <tr key={k}><td>{k}</td><td><span className={r.status === 'succeeded' ? 'dl-pill ok' : r.status === 'failed' ? 'dl-pill da' : 'dl-pill'}>{tr(`run.${String(r.status)}`, String(r.status))}</span>{r.error ? <div className="dl-mu" style={{ fontSize: 12 }}>{String(r.error).slice(0, 160)}</div> : null}</td><td>{fmtDate(lang, r.startedAt)}</td><td>{r.durationMs ? `${Math.round(Number(r.durationMs) / 100) / 10} s` : '—'}</td></tr>
                ))}
              </tbody></table></div>
            )}
          </Section>
          <Section id="errors" title={tr('kpi.erreurs', 'Erreurs non résolues')} action={<Link href="/admin/collections/error-logs" style={{ fontSize: 12.5 }}>{tr('pv.all', 'Tout voir')}</Link>}>
            {errors.docs.length === 0 ? <p className="dl-empty">{tr('sante.noerrors', 'Aucune erreur ouverte.')}</p> : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {(errors.docs as unknown as Row[]).map((e) => (
                  <li key={e.id} className="dl-row dl-sb dl-wr" style={{ gap: 8, padding: '8px 0', borderBottom: '1px solid var(--dl-ln)' }}>
                    <div style={{ minWidth: 0, flex: '1 1 300px' }}><Link href={`/admin/collections/error-logs/${e.id}`}><b>{String(e.message).slice(0, 140)}</b></Link><div className="dl-mu" style={{ fontSize: 12 }}>{String(e.route ?? e.path ?? '')} · ×{String(e.count ?? 1)} · {fmtDate(lang, e.lastSeen)}</div></div>
                    <Act path={`/api/error-logs/${e.id}`} body={{ resolved: true }} label={tr('sante.resolve', 'Marquer résolue')} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section id="mails" title={tr('sante.mails', 'Emails des 7 derniers jours')} action={<Link href="/admin/collections/email-deliveries" style={{ fontSize: 12.5 }}>{tr('pv.all', 'Tout voir')}</Link>}>
            <Bars label={tr('sante.mails', 'Emails des 7 derniers jours')} rows={sumBy(mails.docs as unknown as Row[], (m) => String(m.status), () => 1)} />
          </Section>
        </>
      )
    }} />
  )
}

/** Sécurité : comptes de l’équipe, secrets présents, limitation de débit, arrêt général. */
export function SecuriteView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} render={async ({ req, tr, lang }) => {
      const p = req.payload
      const [users, controls, limits, audit] = await Promise.all([
        p.find({ collection: 'users', req, overrideAccess: false, depth: 0, limit: 50, sort: 'role' }),
        p.findGlobal({ slug: 'controls', req, overrideAccess: false, depth: 0 }) as unknown as Promise<Record<string, unknown>>,
        (p.db as unknown as Db).drizzle.execute(sql`SELECT split_part(key, ':', 1) AS b, COUNT(*)::int AS n, MAX(count)::int AS top FROM rate_limits WHERE reset_at > now() GROUP BY 1 ORDER BY 2 DESC LIMIT 20`).then((r) => r.rows, () => [] as Record<string, unknown>[]),
        p.find({ collection: 'audit-log', req, overrideAccess: false, depth: 0, limit: 12, sort: '-createdAt', where: { target: { in: ['users', 'controls'] } } }).catch(() => ({ docs: [] })),
      ])
      const t = now()
      const SECRETS = ['PAYLOAD_SECRET', 'CRON_SECRET', 'BACKUP_SECRET', 'RESEND_WEBHOOK_SECRET', 'TELEGRAM_WEBHOOK_SECRET', 'TURNSTILE_SECRET_KEY']
      return (
        <>
          <Head title={tr('nav.securite', 'Sécurité')} sub={tr('sec.sub', 'Comptes de l’équipe, secrets, limitation de débit. Les secrets restent dans Vercel : ici, seulement leur présence.')} />
          <Section id="ks" title={tr('ui.killswitch', 'Arrêt général')} action={<Link className="dl-btn" href="/admin/cockpit/agents#ks">{tr('sec.manage', 'Gérer')}</Link>}>
            <span className={controls.killSwitch && controls.killSwitch !== 'off' ? 'dl-pill da' : 'dl-pill ok'}>{tr(`ks.${String(controls.killSwitch ?? 'off')}`, String(controls.killSwitch ?? 'off'))}</span>
          </Section>
          <Section id="team" title={`${tr('sec.team', 'Comptes de l’équipe')} · ${users.docs.length}`} sub={tr('sec.team.sub', '8 essais de connexion au plus, puis blocage 15 minutes. Double authentification : pas encore disponible.')} action={<Link href="/admin/collections/users" style={{ fontSize: 12.5 }}>{tr('pv.all', 'Tout voir')}</Link>}>
            <div className="dl-scroll"><table style={{ minWidth: 520 }}><thead><tr><th>{tr('mem2.name', 'Nom')}</th><th>{tr('sec.role', 'Rôle')}</th><th>{tr('sec.state', 'Connexion')}</th><th>Telegram</th></tr></thead><tbody>
              {(users.docs as unknown as Row[]).map((u) => {
                const locked = u.lockUntil && Date.parse(String(u.lockUntil)) > t
                return <tr key={u.id}><td><Link href={`/admin/collections/users/${u.id}`}>{String(u.name ?? u.email)}</Link><div className="dl-mu" style={{ fontSize: 12 }}>{String(u.email)}</div></td><td>{String(u.role)}</td><td>{locked ? <span className="dl-pill da">{tr('sec.locked', 'bloqué jusqu’à')} {fmtDate(lang, u.lockUntil)}</span> : Number(u.loginAttempts) > 0 ? <span className="dl-pill wa">{String(u.loginAttempts)} {tr('sec.failed', 'échec(s)')}</span> : <span className="dl-pill ok">{tr('sec.normal', 'normale')}</span>}</td><td>{u.telegramId ? '✓' : '—'}</td></tr>
              })}
            </tbody></table></div>
          </Section>
          <div className="dl-cols">
            <Section id="secrets" title={tr('sec.secrets', 'Secrets')}>
              <div className="dl-row dl-wr" style={{ gap: 6 }}>{SECRETS.map((k) => <span key={k} className={process.env[k] ? 'dl-pill ok' : 'dl-pill wa'}>{k} {process.env[k] ? '✓' : '✕'}</span>)}</div>
            </Section>
            <Section id="limits" title={tr('sec.limits', 'Limitation de débit (fenêtres en cours)')} sub={tr('sec.limits.sub', 'Clients suivis par règle ; les adresses IP ne sont jamais stockées en clair.')}>
              <Bars label={tr('sec.limits', 'Limitation de débit (fenêtres en cours)')} rows={limits.map((r) => [String(r.b), Number(r.n)] as [string, number])} />
            </Section>
          </div>
          <Section id="audit" title={tr('sec.audit', 'Dernières actions sensibles (comptes, commandes)')} action={<Link href="/admin/collections/audit-log" style={{ fontSize: 12.5 }}>{tr('pv.all', 'Tout voir')}</Link>}>
            {audit.docs.length === 0 ? <p className="dl-empty">{tr('hist.journal.none', 'Aucune entrée.')}</p> : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{(audit.docs as unknown as Row[]).map((a) => <li key={a.id} className="dl-row dl-wr" style={{ gap: 8, padding: '7px 0', borderBottom: '1px solid var(--dl-ln)', fontSize: 13 }}><span className="dl-pill">{String(a.actorLabel ?? '')}</span><span>{String(a.summary ?? a.action)}</span><span className="dl-mu" style={{ fontSize: 12 }}>{fmtDate(lang, a.createdAt)}</span></li>)}</ul>
            )}
          </Section>
        </>
      )
    }} />
  )
}
