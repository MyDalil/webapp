import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { DEFAULT_MODES, TOOLS } from '@/modules/agents'
import { Icon } from '../icons'
import { Act } from './Act'
import { CockpitPage, fmtDate, Head, Section, STATUS_PILL, usd } from './CockpitPage'
import { KillSwitch, Money, NotifyMatrix, Toggle, ToolModes } from './Controls'

type Row = Record<string, unknown> & { id: number }
const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString() }
const DEP_LABEL: Record<string, string> = { '00-direction': 'Direction', '01-editorial': 'Editorial', '02-confiance': 'Confiance', '03-communaute': 'Communauté et support', '04-croissance': 'Croissance', '05-produit-tech': 'Produit et tech', '06-donnees': 'Données', '07-administration': 'Administration' }

/** Salle de contrôle : arrêt général, agents par département, réserve, autonomie par outil, notifications. */
export function AgentsView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} render={async ({ req, tr, lang }) => {
      const p = req.payload
      const [controls, agents, usage, current] = await Promise.all([
        p.findGlobal({ slug: 'controls', req, overrideAccess: false, depth: 0 }) as unknown as Promise<Record<string, unknown>>,
        p.find({ collection: 'agents', req, overrideAccess: false, depth: 0, limit: 100, sort: 'department' }),
        p.find({ collection: 'ai-usage', req, overrideAccess: false, depth: 0, pagination: false, where: { and: [{ feature: { equals: 'agent' } }, { createdAt: { greater_than_equal: monthStart() } }] }, select: { agent: true, costMicros: true } as never }),
        p.find({ collection: 'agent-tasks', req, overrideAccess: false, depth: 0, limit: 100, where: { status: { in: ['running', 'review'] } }, sort: '-updatedAt' }),
      ])
      const spent = new Map<number, number>()
      for (const u of usage.docs as unknown as Row[]) spent.set(Number(u.agent), (spent.get(Number(u.agent)) ?? 0) + (Number(u.costMicros) || 0))
      const totalSpent = [...spent.values()].reduce((a, b) => a + b, 0)
      const taskOf = new Map<number, Row>()
      for (const t of current.docs as unknown as Row[]) if (!taskOf.has(Number(t.agent))) taskOf.set(Number(t.agent), t)
      const list = agents.docs as unknown as Row[]
      const active = list.filter((a) => a.status !== 'reserve')
      const reserve = list.filter((a) => a.status === 'reserve')
      const ks = String(controls.killSwitch ?? 'off')
      const budget = (controls.agentsMonthlyBudgetUsd as number | null) ?? null
      const toolLabel = Object.fromEntries(TOOLS.map((t) => [t.value, t.label]))
      const modeLabels = { default: tr('mode.default', 'Défaut'), execute: tr('mode.execute', 'Exécute'), propose: tr('mode.propose', 'Propose'), forbidden: tr('mode.forbidden', 'Interdit') }
      const statusLabel = (s: unknown) => tr(`status.${String(s)}`, String(s))

      return (
        <>
          <Head title={tr('nav.salle', 'Salle de contrôle')} sub={tr('agents.sub', 'Les agents travaillent à la demande. Saïd a le dernier mot. Chaque action porte un identifiant.')}>
            <Link className="dl-btn" href="/admin/cockpit/activite">{tr('nav.activite', 'Fil d’activité')}</Link>
            <Link className="dl-btn pri" href="/admin/cockpit/taches">{tr('agents.newTask', 'Nouvelle tâche')}</Link>
          </Head>

          <Section id="ks" title={tr('ui.killswitch', 'Arrêt général')} sub={ks === 'off' ? tr('ks.off.sub', 'Désactivé : tout fonctionne.') : tr(`ks.${ks}.sub`, ks)} style={ks === 'off' ? undefined : { borderColor: 'var(--dl-da)' }}>
            <KillSwitch mode={ks} labels={{ title: tr('ui.killswitch', 'Arrêt général'), off: tr('ks.off', 'Désactivé'), drain: tr('ks.drain', 'Finir puis arrêter'), stop: tr('ks.stop', 'Arrêter maintenant'), cut: tr('ks.cut', 'Tout couper') }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 14 }}>
              <Toggle path="/api/globals/controls" field="agentsEnabled" value={controls.agentsEnabled !== false} label={tr('ctl.agents', 'Agents IA actifs')} />
              <Toggle path="/api/globals/controls" field="telegramEnabled" value={controls.telegramEnabled !== false} label={tr('ctl.telegram', 'Bot Telegram actif')} />
              <Toggle path="/api/globals/controls" field="maintenance" value={controls.maintenance === true} label={tr('ctl.maintenance', 'Site en maintenance')} />
              <Money path="/api/globals/controls" field="agentsMonthlyBudgetUsd" value={budget} label={tr('ctl.budget', 'Budget mensuel des agents (USD)')} hint={`${tr('ctl.spent', 'Dépensé ce mois')} : ${usd(totalSpent)}${budget == null ? ` · ${tr('ctl.nobudget', 'vide = aucun agent ne travaille')}` : ''}`} />
            </div>
          </Section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {active.map((a) => {
              const t = taskOf.get(a.id)
              const s = spent.get(a.id) ?? 0
              const cap = (a.monthlyBudgetUsd as number | null) ?? null
              return (
                <article key={a.id} className="dl-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-label={String(a.name)}>
                  <div className="dl-row dl-sb">
                    <div className="dl-row"><span className="dl-ico" style={{ color: 'var(--dl-g)' }}><Icon name="bot" /></span><div><b style={{ display: 'block' }}>{String(a.name)}</b><span className="dl-mu" style={{ fontSize: 12 }}>{DEP_LABEL[String(a.department)] ?? String(a.department ?? '')}</span></div></div>
                    <span className={STATUS_PILL[String(a.status)] ?? 'dl-pill'}><span className="dl-dot" />{statusLabel(a.status)}</span>
                  </div>
                  <code className="dl-mu" style={{ fontSize: 11.5 }}>{String(a.roleId ?? a.slug)}</code>
                  <div className="dl-mu" style={{ fontSize: 12.5 }}>{String(a.provider)} · {String(a.model)}</div>
                  <div>
                    <div className="dl-row dl-sb" style={{ fontSize: 12.5 }}><span className="dl-mu">{tr('agents.month', 'Ce mois')}</span><span>{usd(s)}{cap != null ? ` / ${cap} $` : ''}</span></div>
                    {cap ? <div className="dl-meter" style={{ marginTop: 6 }}><span style={{ width: `${Math.min(100, (s / (cap * 1_000_000)) * 100)}%` }} /></div> : null}
                  </div>
                  <div style={{ padding: 10, borderRadius: 12, background: 'var(--dl-s2)', fontSize: 13 }}>
                    {t ? <Link href={`/admin/collections/agent-tasks/${t.id}`} style={{ color: 'inherit' }}><b>#{t.id}</b> {String(t.title)} · <span className="dl-mu">{statusLabel(t.status)} · {tr('agents.step', 'étape')} {String(t.steps ?? 0)}</span></Link> : <span className="dl-mu">{tr('agents.idle', 'Aucune tâche en cours.')}</span>}
                  </div>
                  <div className="dl-row dl-wr" style={{ gap: 6 }}>
                    {a.status === 'active'
                      ? <Act path={`/api/agents/${a.id}`} body={{ status: 'paused' }} label={tr('agents.pause', 'Mettre en pause')} />
                      : <Act path={`/api/agents/${a.id}`} body={{ status: 'active' }} label={tr('agents.resume', 'Reprendre')} />}
                    <Act path="/api/agents/role" method="POST" body={{ slug: a.slug, action: 'reserve' }} label={tr('agents.toReserve', 'Remettre en réserve')} className="dl-btn" confirm={tr('agents.toReserve.confirm', 'Remettre ce rôle en réserve ?')} />
                    <Link className="dl-btn" href={`/admin/cockpit/memoire#${String(a.slug)}`}>{tr('nav.memoire', 'Mémoire et skills')}</Link>
                  </div>
                  <details>
                    <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>{tr('agents.autonomy', 'Autonomie par outil')}</summary>
                    <ToolModes agentId={a.id} tools={((a.tools as string[]) ?? []).map((v) => ({ value: v, label: toolLabel[v] ?? v, def: DEFAULT_MODES[v] ?? 'propose' }))} modes={((a.toolModes as Array<{ tool: string; mode: string }>) ?? [])} labels={modeLabels} />
                  </details>
                </article>
              )
            })}
          </div>

          <Section id="reserve" title={`${tr('agents.reserve', 'Rôles en réserve')} · ${reserve.length}`} sub={tr('agents.reserve.sub', 'Prêts à l’emploi. Activation en un clic, sans déploiement, après un test à froid. Aussi par Telegram : /activer <rôle>.')}>
            {reserve.length === 0 ? <p className="dl-empty">{tr('agents.reserve.none', 'Aucun rôle en réserve.')}</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
                {reserve.map((a) => (
                  <div key={a.id} style={{ border: '1px solid var(--dl-ln)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="dl-row dl-sb"><b>{String(a.name)}</b><span className="dl-pill">{DEP_LABEL[String(a.department)] ?? ''}</span></div>
                    <div className="dl-mu" style={{ fontSize: 12.5 }}>{String(a.mission ?? '')}</div>
                    {a.coldTestResult ? <div className={a.coldTestResult === 'pass' ? 'dl-pill ok' : 'dl-pill da'} style={{ whiteSpace: 'normal' }}>{tr('agents.cold', 'Test à froid')} · {fmtDate(lang, a.coldTestAt)} · {String(a.coldTestDetail ?? '')}</div> : null}
                    <Act path="/api/agents/role" method="POST" body={{ slug: a.slug }} label={tr('agents.activate', 'Activer')} className="dl-btn pri" />
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section id="notif" title={tr('agents.notify', 'Notifications des agents')} sub={tr('agents.notify.sub', 'Avant, pendant et après chaque action, avec le travail joint. Le fil de l’admin reçoit toujours tout.')}>
            <NotifyMatrix value={(controls.notifications as Record<string, string[]>) ?? {}} labels={{ moment: tr('notify.moment', 'Moment'), before: tr('phase.before', 'Avant'), during: tr('phase.during', 'Pendant'), after: tr('phase.after', 'Après'), order: tr('phase.order', 'Ordre'), admin: tr('chan.admin', 'Admin'), telegram_said: tr('chan.said', 'Telegram Saïd'), telegram_rad: tr('chan.rad', 'Telegram Rad'), email: tr('chan.email', 'Email') }} />
          </Section>
        </>
      )
    }} />
  )
}
