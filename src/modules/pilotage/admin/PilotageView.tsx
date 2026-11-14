import type { AdminViewServerProps } from 'payload'
import Link from 'next/link'
import { getPilotageKpis, type Kpi } from '../kpis'
import { depsFor } from './data'
import { asLang, t } from './i18n'
import { Icon } from './icons'

const PHASE_PILL: Record<string, string> = { before: 'dl-pill in', during: 'dl-pill ok', after: 'dl-pill', order: 'dl-pill wa' }
const TONE: Record<Kpi['tone'], string> = { ok: 'var(--dl-g)', wa: 'var(--dl-wa)', da: 'var(--dl-da)', in: 'var(--dl-in)' }
const nf = (lang: string) => new Intl.NumberFormat(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-GB' : 'fr-FR', { maximumFractionDigits: 2 })

type Row = Record<string, unknown> & { id: number | string }

/** Accueil /admin : la vue Pilotage, branchée sur Neon avec les droits de la personne connectée. */
export async function PilotageView({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const lang = asLang(req.i18n?.language)
  const tr = t(lang)
  const fmt = nf(lang)
  const find = async (collection: string, opts: Record<string, unknown>) => {
    try {
      return (await req.payload.find({ collection: collection as never, req, overrideAccess: false, depth: 1, limit: 5, ...opts })).docs as Row[]
    } catch {
      return null
    }
  }
  const [kpis, agents, review, contrib, feed] = await Promise.all([
    getPilotageKpis(depsFor(req), new Date()),
    find('agents', { sort: 'name', limit: 12, depth: 0 }),
    find('agent-tasks', { where: { status: { equals: 'review' } }, sort: '-updatedAt' }),
    find('submissions', { where: { status: { equals: 'new' } }, sort: '-createdAt', depth: 0 }),
    find('agent-notifications', { sort: '-createdAt', limit: 6, depth: 0 }),
  ])
  const name = String((req.user as { name?: string } | null)?.name ?? '').split(' ')[0]
  const day = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  const today = day.charAt(0).toUpperCase() + day.slice(1)
  const status = (s: unknown) => (s === 'active' ? ['dl-pill ok dl-live', tr('pv.status.active')] : s === 'paused' ? ['dl-pill wa', tr('pv.status.paused')] : ['dl-pill', tr('pv.status.disabled')])

  return (
    <div className="dl dl-pv">
      <div>
        <h1>{tr('pv.hello')}{name ? ` ${name}` : ''}</h1>
        <p className="dl-sub">{today}. {tr('pv.sub')}</p>
      </div>

      <section aria-label={tr('pv.kpis')} className="dl-kpis">
        {kpis.map((k) => (
          <Link key={k.key} href={k.href} className="dl-card dl-kpi" prefetch={false}>
            <span className="dl-ico" style={{ color: TONE[k.tone] }}><Icon name={k.icon} /></span>
            <span style={{ minWidth: 0 }}>
              <span className="dl-v">{k.value === null ? '—' : fmt.format(k.value)}</span>
              {k.unit && <span className="dl-u">{k.unit}</span>}
              <span className="dl-kl" style={{ display: 'block' }}>{tr(`kpi.${k.key}`, k.label)}</span>
            </span>
          </Link>
        ))}
      </section>

      <div className="dl-cols">
        <section className="dl-card" aria-labelledby="pv-agents">
          <div className="dl-row dl-sb"><h2 id="pv-agents">{tr('pv.agents')}</h2><Link className="dl-btn" href="/admin/collections/agents">{tr('pv.all')}</Link></div>
          <p className="dl-sub">{tr('pv.agents.sub')}</p>
          {agents === null || agents.length === 0 ? <p className="dl-empty">{tr('pv.agents.none')}</p> : agents.map((a) => {
            const [cls, label] = status(a.status)
            return (
              <Link key={a.id} href={`/admin/collections/agents/${a.id}`} className="dl-li">
                <span className="dl-ico" style={{ color: 'var(--dl-g)' }}><Icon name="bot" /></span>
                <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: 'block' }}>{String(a.name)}</b><span className="dl-mu" style={{ fontSize: 12.5 }}>{String(a.provider ?? '')} · {String(a.model ?? '')}</span></span>
                <span className={cls}><span className="dl-dot" />{label}</span>
              </Link>
            )
          })}
        </section>

        <section className="dl-card" aria-labelledby="pv-review">
          <div className="dl-row dl-sb"><h2 id="pv-review">{tr('pv.review')}</h2><Link className="dl-btn" href="/admin/collections/agent-tasks?where%5Bstatus%5D%5Bequals%5D=review">{tr('pv.all')}</Link></div>
          <p className="dl-sub">{tr('pv.review.sub')}</p>
          {review === null || review.length === 0 ? <p className="dl-empty">{tr('pv.review.none')}</p> : review.map((r) => (
            <Link key={r.id} href={`/admin/collections/agent-tasks/${r.id}`} className="dl-li">
              <span className="dl-ico" style={{ color: 'var(--dl-wa)' }}><Icon name="check" /></span>
              <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: 'block' }}>{String(r.title)}</b><span className="dl-mu" style={{ fontSize: 12.5 }}>{String((r.agent as { name?: string } | null)?.name ?? 'CEO')}</span></span>
              <Icon name="chev" />
            </Link>
          ))}
        </section>

        <section className="dl-card" aria-labelledby="pv-contrib">
          <div className="dl-row dl-sb"><h2 id="pv-contrib">{tr('pv.contrib')}</h2><Link className="dl-btn" href="/admin/collections/submissions?where%5Bstatus%5D%5Bequals%5D=new">{tr('pv.all')}</Link></div>
          <p className="dl-sub">{tr('pv.contrib.sub')}</p>
          {contrib === null || contrib.length === 0 ? <p className="dl-empty">{tr('pv.contrib.none')}</p> : contrib.map((c) => (
            <Link key={c.id} href={`/admin/collections/submissions/${c.id}`} className="dl-li">
              <span className="dl-ico" style={{ color: 'var(--dl-in)' }}><Icon name="inbox" /></span>
              <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(c.subject)}</b><span className="dl-mu" style={{ fontSize: 12.5 }}>{String(c.kind ?? '')}</span></span>
              <Icon name="chev" />
            </Link>
          ))}
        </section>
        <section className="dl-card" aria-labelledby="pv-feed">
          <div className="dl-row dl-sb"><h2 id="pv-feed">{tr('pv.feed')}</h2><Link className="dl-btn" href="/admin/collections/agent-notifications">{tr('pv.all')}</Link></div>
          <p className="dl-sub">{tr('pv.feed.sub')}</p>
          {feed === null || feed.length === 0 ? <p className="dl-empty">{tr('pv.feed.none')}</p> : feed.map((f) => (
            <Link key={f.id} href={`/admin/collections/agent-notifications/${f.id}`} className="dl-li" style={{ alignItems: 'flex-start' }}>
              <span className={PHASE_PILL[String(f.phase)] ?? 'dl-pill'} style={{ minWidth: 64, justifyContent: 'center' }}>{tr(`phase.${String(f.phase)}`)}</span>
              <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: 'block', fontSize: 13.5 }}>{String(f.agentLabel ?? '')} · {String(f.title)}</b><code className="dl-mu" style={{ fontSize: 11.5 }}>{String(f.actionId ?? '').slice(0, 17)}…</code></span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  )
}
