import Link from 'next/link'
import type { AdminViewServerProps, Where } from 'payload'
import { PREPARED_REPLIES } from '@/modules/messages'
import { Act } from './Act'
import { CockpitPage, fmtDate, Head, Section } from './CockpitPage'
import { FieldEditor } from './Forms'
import { ReplyBox } from './ReplyBox'

type Row = Record<string, unknown> & { id: number }
type Thread = Array<{ at: string; by: string; text: string; delivered: boolean }>
const KINDS = ['email', 'contact', 'contribution', 'application', 'report', 'feedback', 'diagnostic'] as const
const OPEN = ['new', 'processing', 'needs_info']
/** Types dont le changement de statut envoie déjà un email automatique (messages/notify.ts) : traités dans leur fiche. */
const AUTO_NOTIFY = ['contribution', 'application']
const STATUS_PILL: Record<string, string> = { new: 'dl-pill in', processing: 'dl-pill wa', needs_info: 'dl-pill wa', done: 'dl-pill ok', rejected: 'dl-pill' }
const flat = (v: unknown): string => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))

/**
 * Boîte unique : emails reçus, formulaires du site, signalements, questions des agents.
 * Réponse au demandeur avec réponses préparées ; fil des réponses ; note interne jamais envoyée.
 */
export function BoiteView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} roles={['patron', 'admin', 'editor']} render={async ({ req, tr, lang }) => {
      const p = req.payload
      const sp = (props.searchParams ?? {}) as Record<string, string | undefined>
      const kind = KINDS.find((k) => k === sp.k)
      const all = sp.s === 'all'
      const id = Number(sp.id) || null
      const and: Where[] = []
      if (kind) and.push({ kind: { equals: kind } })
      if (!all) and.push({ status: { in: OPEN } })
      const [list, counts, questions, open] = await Promise.all([
        p.find({ collection: 'submissions', req, overrideAccess: false, depth: 0, limit: 60, sort: '-createdAt', where: and.length ? { and } : undefined }),
        Promise.all(KINDS.map(async (k) => [k, (await p.count({ collection: 'submissions', req, overrideAccess: false, where: { and: [{ kind: { equals: k } }, { status: { in: OPEN } }] } })).totalDocs] as const)),
        p.find({ collection: 'agent-messages', req, overrideAccess: false, depth: 0, limit: 10, sort: '-createdAt', where: { and: [{ toHuman: { exists: true } }, { kind: { equals: 'question' } }] } }).catch(() => ({ docs: [] })),
        id ? p.find({ collection: 'submissions', req, overrideAccess: false, depth: 0, limit: 1, where: { id: { equals: id } } }).then((r) => r.docs[0] as unknown as Row | undefined) : Promise.resolve(undefined),
      ])
      const href = (o: Record<string, string | number | undefined | null>) => {
        const s = new URLSearchParams()
        for (const [k, v] of Object.entries({ k: kind, s: all ? 'all' : undefined, ...o })) if (v != null && v !== '') s.set(k, String(v))
        return `/admin/cockpit/boite${s.size ? `?${s}` : ''}`
      }
      const kindLabel = (k: unknown) => tr(`box.k.${String(k)}`, String(k))
      const statusLabel = (s: unknown) => tr(`box.s.${String(s)}`, String(s))
      const docs = list.docs as unknown as Row[]
      const data = (open?.data ?? {}) as Record<string, unknown>
      const thread = (Array.isArray(open?.thread) ? open?.thread : []) as Thread

      return (
        <>
          <Head title={tr('nav.boite', 'Boîte unique')} sub={tr('box.sub', 'Emails, formulaires du site, signalements et questions des agents, au même endroit. Une réponse part par email avec « Répondre à » l’équipe.')}>
            <Link className="dl-btn" href="/admin/collections/submissions">{tr('ui.table', 'Vue tableau')}</Link>
          </Head>

          <nav className="dl-seg" aria-label={tr('box.filter', 'Type')} style={{ flexWrap: 'wrap', alignSelf: 'flex-start' }}>
            <Link href={href({ k: undefined, id: null })} className={!kind ? 'on' : undefined} aria-current={!kind ? 'page' : undefined}>{tr('box.k.all', 'Tout')} · {counts.reduce((n, [, c]) => n + c, 0)}</Link>
            {counts.map(([k, c]) => <Link key={k} href={href({ k, id: null })} className={kind === k ? 'on' : undefined} aria-current={kind === k ? 'page' : undefined}>{kindLabel(k)}{c ? ` · ${c}` : ''}</Link>)}
          </nav>

          <div className="dl-box">
            <section className="dl-card" aria-label={tr('box.list', 'Demandes')} style={{ padding: 0, overflow: 'hidden' }}>
              <div className="dl-row dl-sb" style={{ padding: '12px 14px', borderBottom: '1px solid var(--dl-ln)' }}>
                <b>{all ? tr('box.all', 'Toutes les demandes') : tr('box.open', 'À traiter')}</b>
                <Link href={href({ s: all ? undefined : 'all', id: null })} style={{ fontSize: 12.5 }}>{all ? tr('box.onlyOpen', 'À traiter seulement') : tr('box.showAll', 'Voir aussi les traitées')}</Link>
              </div>
              {docs.length === 0 ? <p className="dl-empty" style={{ padding: '12px 14px' }}>{tr('box.none', 'Rien à traiter. Tout est à jour.')}</p> : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {docs.map((d) => (
                    <li key={d.id}>
                      <Link href={href({ id: d.id })} className="dl-boxrow" aria-current={open?.id === d.id ? 'true' : undefined}>
                        <span className="dl-row dl-sb" style={{ gap: 6 }}><b className="dl-med-t" style={{ minWidth: 0 }}>{String(d.subject)}</b><span className={STATUS_PILL[String(d.status)] ?? 'dl-pill'}>{statusLabel(d.status)}</span></span>
                        <span className="dl-mu" style={{ fontSize: 12 }}>{kindLabel(d.kind)} · {String(d.email ?? '—')} · {fmtDate(lang, d.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {open ? (
              <section className="dl-card" aria-labelledby="msg" style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
                <div className="dl-row dl-sb dl-wr">
                  <div><h2 id="msg">{String(open.subject)}</h2><span className="dl-mu" style={{ fontSize: 12.5 }}>{kindLabel(open.kind)} · {String(open.email ?? tr('box.noEmail', 'sans email'))} · {fmtDate(lang, open.createdAt)}</span></div>
                  <span className={STATUS_PILL[String(open.status)] ?? 'dl-pill'}>{statusLabel(open.status)}</span>
                </div>
                {typeof data.text === 'string' ? <div className="dl-pre" style={{ maxHeight: 420 }}>{data.text}</div> : (
                  <dl className="dl-kv">{Object.entries(data).filter(([k]) => !['attachments', 'resendId'].includes(k)).slice(0, 40).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{flat(v)}</dd></div>)}</dl>
                )}
                {Array.isArray(data.attachments) && data.attachments.length ? <p className="dl-mu" style={{ margin: 0, fontSize: 12.5 }}>{tr('box.attachments', 'Pièces jointes (dans Resend)')} : {(data.attachments as Array<{ filename?: string }>).map((a) => a.filename ?? '?').join(', ')}</p> : null}
                {thread.length ? (
                  <div><b className="lbl">{tr('box.thread', 'Réponses envoyées')} · {thread.length}</b>
                    <ol style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'grid', gap: 6 }}>
                      {thread.map((t, i) => <li key={i} className="dl-msg dl-msg-agent"><div className="dl-mu" style={{ fontSize: 12 }}>{t.by} · {fmtDate(lang, t.at)} · {t.delivered ? tr('box.accepted', 'accepté par Resend') : tr('box.failed', 'non envoyé')}</div><p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{t.text}</p></li>)}
                    </ol>
                  </div>
                ) : null}
                {AUTO_NOTIFY.includes(String(open.kind)) ? (
                  <p className="dl-mu" style={{ margin: 0 }}>{tr('box.auto', 'Cette demande se traite dans sa fiche : chaque changement de statut envoie déjà un email au demandeur.')} <Link href={`/admin/collections/submissions/${open.id}`}>{tr('box.openFiche', 'Ouvrir la fiche')}</Link></p>
                ) : open.email ? (
                  <div><b className="lbl">{tr('box.reply', 'Répondre')}</b>
                    <ReplyBox id={open.id} prepared={PREPARED_REPLIES.filter((r) => r.kinds.includes('*') || r.kinds.includes(String(open.kind)))} statuses={['processing', 'needs_info', 'done', 'rejected'].map((v) => ({ value: v, label: `${tr('box.then', 'Puis')} : ${statusLabel(v)}` }))} labels={{ prepared: tr('box.prepared', 'Réponse préparée…'), text: tr('box.text', 'Votre réponse'), status: tr('box.statusAfter', 'Statut après l’envoi'), keep: tr('box.keep', 'Statut inchangé'), send: tr('box.send', 'Envoyer la réponse'), sent: tr('box.sent', 'Réponse acceptée par Resend.'), notSent: tr('box.notSent', 'Réponse enregistrée, mais l’email n’est pas parti (Resend non configuré ou refus).') }} />
                  </div>
                ) : <p className="dl-mu" style={{ margin: 0 }}>{tr('box.noEmailReply', 'Pas d’adresse email : réponse impossible depuis ici.')}</p>}
                {!AUTO_NOTIFY.includes(String(open.kind)) && OPEN.includes(String(open.status)) ? <div><Act path={`/api/submissions/${open.id}`} body={{ status: 'done' }} label={tr('box.close', 'Classer sans réponse')} /></div> : null}
                <div><b className="lbl">{tr('box.note', 'Note interne (jamais envoyée)')}</b><FieldEditor path={`/api/submissions/${open.id}`} field="internalNote" value={String(open.internalNote ?? '')} label={tr('box.note', 'Note interne (jamais envoyée)')} save={tr('ui.save', 'Enregistrer')} rows={3} /></div>
              </section>
            ) : (
              <section className="dl-card" aria-label={tr('box.agents', 'Questions des agents')} style={{ alignContent: 'start' }}>
                <h2>{tr('box.agents', 'Questions des agents')}</h2>
                {questions.docs.length === 0 ? <p className="dl-empty">{tr('box.agents.none', 'Aucune question en attente.')}</p> : (
                  <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 8 }}>
                    {(questions.docs as unknown as Row[]).map((m) => <li key={m.id} className="dl-msg"><div className="dl-mu" style={{ fontSize: 12 }}>{String(m.fromLabel ?? '')} · {fmtDate(lang, m.createdAt)}</div><p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{String(m.body)}</p>{m.task ? <Link href={`/admin/collections/agent-tasks/${String(m.task)}`} style={{ fontSize: 12.5 }}>{tr('act.task', 'Tâche')} #{String(m.task)}</Link> : null}</li>)}
                  </ul>
                )}
                <p className="dl-mu" style={{ fontSize: 12.5 }}>{tr('box.pick', 'Choisissez une demande à gauche pour la lire et y répondre.')}</p>
              </section>
            )}
          </div>
          <Section id="mail" title={tr('box.mailIn', 'Réception des emails')} sub={tr('box.mailIn.sub', 'Les emails arrivent ici quand Resend Inbound est relié (enregistrement MX chez Gandi, webhook « email.received »). Aucun accusé automatique : pas de boucle.')}>
            <span className={process.env.RESEND_WEBHOOK_SECRET && process.env.RESEND_API_KEY ? 'dl-pill ok' : 'dl-pill wa'} style={{ whiteSpace: 'normal' }}>{process.env.RESEND_WEBHOOK_SECRET && process.env.RESEND_API_KEY ? tr('box.mailIn.ready', 'Webhook prêt') : tr('box.mailIn.missing', 'RESEND_API_KEY ou RESEND_WEBHOOK_SECRET absent')}</span>
          </Section>
        </>
      )
    }} />
  )
}
