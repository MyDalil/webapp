import Link from 'next/link'
import type { AdminViewServerProps, Where } from 'payload'
import { categoryLabel, classifiedRisks, type Risk } from '@/modules/annonces'
import { Act, TextAct } from './Act'
import { CockpitPage, fmtDate, Head, Section } from './CockpitPage'

type Row = Record<string, unknown> & { id: number }
const weekAgo = () => new Date(Date.now() - 7 * 86_400_000).toISOString()
const RISK_PILL: Record<Risk['level'], string> = { faible: 'dl-pill ok', moyen: 'dl-pill wa', eleve: 'dl-pill da' }
const idOf = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number | null))
const thumb = (m: unknown) => (m && typeof m === 'object' ? ((m as { sizes?: { thumb?: { url?: string } }; url?: string }).sizes?.thumb?.url ?? (m as { url?: string }).url) : undefined)

/** Modération : une vue de toutes les files à contrôler, avec les avis récents à masquer si besoin. */
export function ModerationView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} roles={['patron', 'admin', 'editor']} render={async ({ req, tr, lang }) => {
      const p = req.payload
      const n = (collection: string, where: Where) => p.count({ collection: collection as never, req, overrideAccess: false, where }).then((r) => r.totalDocs).catch(() => 0)
      const week = weekAgo()
      const [ads, reported, photos, reports, pros, reviews] = await Promise.all([
        n('classifieds', { status: { equals: 'pending' } }),
        n('classifieds', { and: [{ status: { equals: 'published' } }, { reports: { greater_than: 0 } }] }),
        n('media', { moderation: { equals: 'to-check' } }),
        n('submissions', { and: [{ kind: { equals: 'report' } }, { status: { in: ['new', 'processing'] } }] }),
        n('providers', { status: { equals: 'pending' } }),
        p.find({ collection: 'provider-reviews', req, overrideAccess: false, depth: 1, limit: 20, sort: '-createdAt', where: { createdAt: { greater_than_equal: week } } }).catch(() => ({ docs: [] })),
      ])
      const queues = [
        { key: 'ads', n: ads, label: tr('mod.ads', 'Annonces à contrôler'), href: '/admin/cockpit/annonces' },
        { key: 'reported', n: reported, label: tr('mod.reported', 'Annonces publiées signalées'), href: '/admin/cockpit/annonces?v=reported' },
        { key: 'photos', n: photos, label: tr('mod.photos', 'Photos de comptes à contrôler'), href: '/admin/cockpit/medias?f=to-check' },
        { key: 'reports', n: reports, label: tr('mod.reports', 'Signalements reçus'), href: '/admin/cockpit/boite?k=report' },
        { key: 'pros', n: pros, label: tr('mod.pros', 'Professionnels en attente'), href: '/admin/cockpit/pros' },
      ]
      return (
        <>
          <Head title={tr('nav.moderation', 'Modération')} sub={tr('mod.sub', 'Tout ce qui attend un contrôle humain. Un agent peut donner son avis ; il ne publie jamais.')} />
          <div className="dl-kpis">
            {queues.map((q) => (
              <Link key={q.key} href={q.href} className="dl-card dl-kpi">
                <div><div className="dl-v">{q.n}</div><div className="dl-kl">{q.label}</div></div>
              </Link>
            ))}
          </div>
          <Section id="rev" title={`${tr('mod.reviews', 'Avis des 7 derniers jours')} · ${reviews.docs.length}`} sub={tr('mod.reviews.sub', 'Publiés tout de suite. Masquez un avis injurieux, hors sujet ou trompeur ; la note moyenne se recalcule.')}>
            {reviews.docs.length === 0 ? <p className="dl-empty">{tr('mod.reviews.none', 'Aucun avis récent.')}</p> : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {(reviews.docs as Row[]).map((r) => (
                  <li key={r.id} className="dl-msg" style={{ maxWidth: 'none' }}>
                    <div className="dl-row dl-sb dl-wr" style={{ gap: 6 }}>
                      <span><b>{'★'.repeat(Number(r.rating) || 0)}{'☆'.repeat(5 - (Number(r.rating) || 0))}</b> <span className="dl-mu" style={{ fontSize: 12 }}>· {String((r.provider as Row | null)?.displayName ?? '')} · {fmtDate(lang, r.createdAt)}</span></span>
                      {r.status === 'hidden' ? <span className="dl-pill">{tr('mod.hidden', 'Masqué')}</span> : <Act path={`/api/provider-reviews/${r.id}`} body={{ status: 'hidden' }} label={tr('mod.hide', 'Masquer')} confirm={tr('mod.hide.confirm', 'Masquer cet avis ?')} />}
                    </div>
                    <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{String(r.comment ?? r.text ?? '')}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )
    }} />
  )
}

/** Annonces : à contrôler ou signalées, triées par score anti-arnaque ; publier ou refuser avec motif. */
export function AnnoncesView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} roles={['patron', 'admin', 'editor']} render={async ({ req, tr, lang }) => {
      const sp = (props.searchParams ?? {}) as Record<string, string | undefined>
      const v = sp.v === 'reported' ? 'reported' : 'pending'
      const where: Where = v === 'reported' ? { and: [{ status: { equals: 'published' } }, { reports: { greater_than: 0 } }] } : { status: { equals: 'pending' } }
      const res = await req.payload.find({ collection: 'classifieds', req, overrideAccess: false, depth: 1, limit: 40, sort: 'createdAt', where })
      const ads = res.docs as unknown as Array<Row & { title: string; description: string; category: string; subcategory: string; createdAt: string }>
      const risks = await classifiedRisks(req, ads.map((a) => ({ ...a, author: idOf(a.author), photos: (a.photos as unknown[]) ?? [] })) as never)
      const sorted = [...ads].sort((a, b) => (risks.get(b.id)?.score ?? 0) - (risks.get(a.id)?.score ?? 0))
      return (
        <>
          <Head title={tr('nav.annonces', 'Annonces')} sub={tr('ann.sub', 'Le score anti-arnaque aide à trier : chaque point vient d’un signal visible. La décision reste humaine.')}>
            <Link className="dl-btn" href="/admin/collections/classifieds">{tr('ui.table', 'Vue tableau')}</Link>
          </Head>
          <nav className="dl-seg" aria-label={tr('ann.view', 'Vue')} style={{ alignSelf: 'flex-start' }}>
            <Link href="/admin/cockpit/annonces" className={v === 'pending' ? 'on' : undefined} aria-current={v === 'pending' ? 'page' : undefined}>{tr('mod.ads', 'Annonces à contrôler')}</Link>
            <Link href="/admin/cockpit/annonces?v=reported" className={v === 'reported' ? 'on' : undefined} aria-current={v === 'reported' ? 'page' : undefined}>{tr('mod.reported', 'Annonces publiées signalées')}</Link>
          </nav>
          {sorted.length === 0 ? <p className="dl-card dl-empty">{tr('ann.none', 'Aucune annonce dans cette file.')}</p> : sorted.map((a) => {
            const r = risks.get(a.id)
            const photos = ((a.photos as unknown[]) ?? []).map(thumb).filter(Boolean) as string[]
            return (
              <article key={a.id} className="dl-card" style={{ display: 'grid', gap: 10 }} aria-label={a.title}>
                <div className="dl-row dl-sb dl-wr">
                  <div style={{ minWidth: 0 }}><h2 style={{ margin: 0 }}><Link href={`/admin/collections/classifieds/${a.id}`} style={{ color: 'inherit' }}>{a.title}</Link></h2>
                    <span className="dl-mu" style={{ fontSize: 12.5 }}>{categoryLabel(a.category)} · {a.price ? `${Number(a.price).toLocaleString('fr-FR')} DA` : tr('ann.noprice', 'sans prix')} · {String(a.wilaya ?? '')} · {String(a.authorName ?? '')} · {fmtDate(lang, a.createdAt)}{a.example ? ` · ${tr('ann.example', 'Exemple')}` : ''}</span>
                  </div>
                  {r ? <span className={RISK_PILL[r.level]} title={tr('ann.score', 'Score anti-arnaque')}>{tr('ann.score', 'Score anti-arnaque')} {r.score}/100</span> : null}
                </div>
                {photos.length ? (
                  <div className="dl-row dl-wr" style={{ gap: 6 }}>
                    {photos.slice(0, 8).map((u, i) => (
                      // eslint-disable-next-line @next/next/no-img-element -- vignette déjà réduite (480 px)
                      <img key={i} src={u} alt="" width={96} height={72} style={{ objectFit: 'cover', borderRadius: 8 }} />
                    ))}
                  </div>
                ) : null}
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13.5 }}>{a.description.slice(0, 600)}{a.description.length > 600 ? '…' : ''}</p>
                {r?.signals.length ? <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 12.5 }}>{r.signals.map((s) => <li key={s.key}><b>+{s.points}</b> {tr(`risk.${s.key}`, s.label)}</li>)}</ul> : <span className="dl-mu" style={{ fontSize: 12.5 }}>{tr('ann.nosignal', 'Aucun signal d’arnaque repéré.')}</span>}
                {a.agentVerdict ? <p className="dl-mu" style={{ margin: 0, fontSize: 12.5 }}>{tr('ann.agent', 'Avis de l’agent')} : <b>{String(a.agentVerdict)}</b>{a.agentNote ? ` — ${String(a.agentNote)}` : ''}</p> : null}
                <div className="dl-row dl-wr" style={{ gap: 8, alignItems: 'flex-start' }}>
                  {v === 'pending' ? <Act path={`/api/classifieds/${a.id}`} body={{ status: 'published' }} label={tr('ann.publish', 'Publier')} className="dl-btn pri" /> : <Act path={`/api/classifieds/${a.id}`} body={{ status: 'pending' }} label={tr('ann.recheck', 'Remettre à contrôler')} />}
                  <div style={{ flex: '1 1 300px' }}><TextAct path={`/api/classifieds/${a.id}`} field="rejectionReason" extra={{ status: 'rejected' }} label={tr('ann.reject', 'Refuser')} placeholder={tr('ann.reject.ph', 'Motif du refus (envoyé à l’auteur)')} rows={1} /></div>
                </div>
              </article>
            )
          })}
        </>
      )
    }} />
  )
}

/** Professionnels : en attente ou suspendus, avec leurs pièces ; publication par un administrateur après les vérifications. */
export function ProsView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} roles={['patron', 'admin', 'editor']} render={async ({ req, tr, lang, isAdmin }) => {
      const p = req.payload
      const sp = (props.searchParams ?? {}) as Record<string, string | undefined>
      const st = sp.s === 'suspended' ? 'suspended' : sp.s === 'published' ? 'published' : 'pending'
      const pros = await p.find({ collection: 'providers', req, overrideAccess: false, depth: 0, limit: 50, sort: st === 'published' ? '-updatedAt' : 'createdAt', where: { status: { equals: st } } })
      const ids = (pros.docs as unknown as Row[]).map((x) => x.id)
      const docs = ids.length ? await p.find({ collection: 'provider-documents', req, overrideAccess: false, depth: 0, pagination: false, where: { provider: { in: ids } } }).catch(() => ({ docs: [] })) : { docs: [] }
      const byPro = new Map<number, Row[]>()
      for (const d of docs.docs as Row[]) { const k = Number(idOf(d.provider)); byPro.set(k, [...(byPro.get(k) ?? []), d]) }
      const ok = (b: unknown) => (b ? 'dl-pill ok' : 'dl-pill wa')
      return (
        <>
          <Head title={tr('nav.pros', 'Professionnels')} sub={tr('pros.sub', 'Publication seulement après les vérifications exigées (identité, statut légal, casier pour les missions sensibles). Un abonnement ne donne aucun label.')}>
            <Link className="dl-btn" href="/admin/collections/providers">{tr('ui.table', 'Vue tableau')}</Link>
          </Head>
          <nav className="dl-seg" aria-label={tr('pros.status', 'Statut')} style={{ alignSelf: 'flex-start' }}>
            {(['pending', 'published', 'suspended'] as const).map((s) => <Link key={s} href={`/admin/cockpit/pros${s === 'pending' ? '' : `?s=${s}`}`} className={st === s ? 'on' : undefined} aria-current={st === s ? 'page' : undefined}>{tr(`pros.s.${s}`, s)}</Link>)}
          </nav>
          {pros.docs.length === 0 ? <p className="dl-card dl-empty">{tr('pros.none', 'Aucun professionnel dans cette liste.')}</p> : (pros.docs as unknown as Row[]).map((x) => (
            <article key={x.id} className="dl-card" style={{ display: 'grid', gap: 8 }} aria-label={String(x.displayName)}>
              <div className="dl-row dl-sb dl-wr"><h2 style={{ margin: 0 }}><Link href={`/admin/collections/providers/${x.id}`} style={{ color: 'inherit' }}>{String(x.displayName)}</Link></h2><span className="dl-mu" style={{ fontSize: 12 }}>{fmtDate(lang, x.createdAt)}</span></div>
              <div className="dl-row dl-wr" style={{ gap: 6 }}>
                <span className={ok(x.identityVerified)}>{tr('pros.identity', 'Identité vérifiée')} : {x.identityVerified ? '✓' : '✕'}</span>
                <span className={ok(x.legalVerified)}>{tr('pros.legal', 'Statut légal vérifié')} : {x.legalVerified ? '✓' : '✕'}</span>
                {x.backgroundCheckedAt ? <span className="dl-pill ok">{tr('pros.background', 'Casier vérifié')}</span> : null}
              </div>
              <div><b className="lbl">{tr('pros.docs', 'Pièces reçues')} · {(byPro.get(x.id) ?? []).length}</b>
                {(byPro.get(x.id) ?? []).length === 0 ? <p className="dl-mu" style={{ margin: '4px 0 0', fontSize: 12.5 }}>{tr('pros.nodocs', 'Aucune pièce.')}</p> : (
                  <ul style={{ margin: '4px 0 0', paddingInlineStart: 18, fontSize: 13 }}>{(byPro.get(x.id) ?? []).map((d) => <li key={d.id}><a href={`/api/equipe/pieces/${d.id}`} target="_blank" rel="noreferrer">{String(d.kind)} · {String(d.filename ?? '')}</a> <span className="dl-mu">· {tr('pros.expires', 'supprimée le')} {fmtDate(lang, d.expiresAt)}</span></li>)}</ul>
                )}
              </div>
              <div className="dl-row dl-wr" style={{ gap: 8 }}>
                <Link className="dl-btn" href={`/admin/collections/providers/${x.id}`}>{tr('pros.verify', 'Vérifier dans la fiche')}</Link>
                {isAdmin && st !== 'published' ? <Act path={`/api/providers/${x.id}`} body={{ status: 'published' }} label={tr('pros.publish', 'Publier')} className="dl-btn pri" /> : null}
                {st === 'published' ? <Act path={`/api/providers/${x.id}`} body={{ status: 'suspended' }} label={tr('pros.suspend', 'Suspendre')} className="dl-btn dan" confirm={tr('pros.suspend.confirm', 'Suspendre ce professionnel ? Sa fiche ne sera plus visible.')} /> : null}
              </div>
            </article>
          ))}
        </>
      )
    }} />
  )
}

/** Membres : recherche, compte confirmé, annonces ; la fiche Payload garde toutes les actions. */
export function MembresView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} roles={['patron', 'admin', 'editor']} render={async ({ req, tr, lang }) => {
      const p = req.payload
      const sp = (props.searchParams ?? {}) as Record<string, string | undefined>
      const q = (sp.q ?? '').trim().slice(0, 80)
      const page = Math.max(1, Number(sp.page) || 1)
      const where: Where | undefined = q ? { or: [{ email: { like: q } }, { firstName: { like: q } }, { lastName: { like: q } }, { phone: { like: q } }] } : undefined
      const [list, total, confirmed] = await Promise.all([
        p.find({ collection: 'members', req, overrideAccess: false, depth: 0, limit: 30, page, sort: '-createdAt', where }),
        p.count({ collection: 'members', req, overrideAccess: false }).then((r) => r.totalDocs),
        p.count({ collection: 'members', req, overrideAccess: false, where: { _verified: { equals: true } } }).then((r) => r.totalDocs).catch(() => 0),
      ])
      const ids = (list.docs as unknown as Row[]).map((m) => m.id)
      const ads = ids.length ? await p.find({ collection: 'classifieds', req, overrideAccess: false, depth: 0, pagination: false, select: { author: true } as never, where: { author: { in: ids } } }) : { docs: [] }
      const count = new Map<number, number>()
      for (const a of ads.docs as Row[]) { const k = Number(idOf(a.author)); count.set(k, (count.get(k) ?? 0) + 1) }
      return (
        <>
          <Head title={tr('nav.membres', 'Membres')} sub={`${total} ${tr('mem2.accounts', 'comptes')} · ${confirmed} ${tr('mem2.confirmed', 'confirmés')}`}>
            <Link className="dl-btn" href="/admin/collections/members">{tr('ui.table', 'Vue tableau')}</Link>
          </Head>
          <form className="dl-card dl-row dl-wr" style={{ gap: 8 }} role="search" action="/admin/cockpit/membres">
            <input className="dl-inp" name="q" defaultValue={q} placeholder={tr('mem2.search', 'Nom, email ou téléphone')} aria-label={tr('mem2.search', 'Nom, email ou téléphone')} style={{ flex: '1 1 240px' }} />
            <button className="dl-btn pri" type="submit">{tr('hist.find', 'Chercher')}</button>
          </form>
          <section className="dl-card dl-scroll" aria-label={tr('nav.membres', 'Membres')}>
            {list.docs.length === 0 ? <p className="dl-empty">{tr('ui.cmd.none', 'Aucun résultat.')}</p> : (
              <table style={{ minWidth: 560 }}><thead><tr><th>{tr('mem2.name', 'Nom')}</th><th>{tr('mem2.email', 'Email')}</th><th>{tr('mem2.kind', 'Type')}</th><th>{tr('mem2.ads', 'Annonces')}</th><th>{tr('mem2.since', 'Inscrit le')}</th></tr></thead><tbody>
                {(list.docs as unknown as Row[]).map((m) => (
                  <tr key={m.id}>
                    <td><Link href={`/admin/collections/members/${m.id}`}>{String(m.firstName ?? '')} {String(m.lastName ?? '')}</Link></td>
                    <td>{String(m.email)} {m._verified ? <span className="dl-pill ok">{tr('mem2.ok', 'confirmé')}</span> : <span className="dl-pill wa">{tr('mem2.notok', 'non confirmé')}</span>}</td>
                    <td>{String(m.kind ?? '')}</td>
                    <td>{count.get(m.id) ?? 0}</td>
                    <td>{fmtDate(lang, m.createdAt)}</td>
                  </tr>
                ))}
              </tbody></table>
            )}
          </section>
          {list.totalPages > 1 ? (
            <div className="dl-row" style={{ gap: 8, justifyContent: 'center' }}>
              {list.hasPrevPage ? <Link className="dl-btn" href={`/admin/cockpit/membres?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`}>←</Link> : null}
              <span className="dl-mu">{page} / {list.totalPages}</span>
              {list.hasNextPage ? <Link className="dl-btn" href={`/admin/cockpit/membres?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}>→</Link> : null}
            </div>
          ) : null}
        </>
      )
    }} />
  )
}
