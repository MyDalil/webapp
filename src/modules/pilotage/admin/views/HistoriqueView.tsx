import Link from 'next/link'
import type { AdminViewServerProps, Where } from 'payload'
import { daysLeft, trashCollections, TRASH_DAYS } from '@/platform/trash'
import { Act } from './Act'
import { CockpitPage, fmtDate, Head, Section } from './CockpitPage'
import { LangPreview } from './Preview'

type Row = Record<string, unknown> & { id: number | string }
type Col = { slug: string; versions?: unknown; trash?: boolean; labels?: { plural?: unknown; singular?: unknown }; admin?: { useAsTitle?: string } }
type Change = { field?: string; before?: unknown; after?: unknown }

const label = (c: Col) => (typeof c.labels?.plural === 'string' ? c.labels.plural : c.slug)
const titleOf = (c: Col | undefined, d: Row) => { const t = c?.admin?.useAsTitle ? d[c.admin.useAsTitle] : undefined; return typeof t === 'string' && t ? t : `#${d.id}` }
const short = (v: unknown) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s == null ? '∅' : s.length > 80 ? `${s.slice(0, 80)}…` : s }

/**
 * Historique et corbeille : pour une fiche, l’aperçu FR/AR/EN, les propositions d’agents, le journal d’audit (avec act_…),
 * les versions restaurables ; pour l’ensemble, les dernières modifications et la corbeille (30 jours).
 */
export function HistoriqueView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} roles={['patron', 'admin', 'editor']} render={async ({ req, tr, lang, isAdmin }) => {
      const p = req.payload
      const cols = (p.config.collections as unknown as Col[]).filter((c) => c.versions && c.admin?.useAsTitle)
      const byslug = new Map(cols.map((c) => [c.slug, c]))
      const sp = (props.searchParams ?? {}) as Record<string, string | undefined>
      const c = sp.c && byslug.has(sp.c) ? byslug.get(sp.c)! : undefined
      const id = sp.id && /^\d+$/.test(sp.id) ? Number(sp.id) : null
      const q = (sp.q ?? '').trim().slice(0, 80)

      if (c && id) {
        const doc = (await p.find({ collection: c.slug as never, req, overrideAccess: false, depth: 0, limit: 1, trash: true, where: { id: { equals: id } } })).docs[0] as Row | undefined
        if (!doc) return <><Head title={tr('nav.historique', 'Historique et corbeille')} sub="" /><p className="dl-card dl-empty">{tr('hist.notfound', 'Fiche introuvable.')}</p></>
        const [audit, versions, review] = await Promise.all([
          p.find({ collection: 'audit-log', req, overrideAccess: false, depth: 0, limit: 50, sort: '-createdAt', where: { and: [{ target: { equals: c.slug } }, { targetId: { equals: String(id) } }] } }).catch(() => ({ docs: [] })),
          p.findVersions({ collection: c.slug as never, req, overrideAccess: false, depth: 0, limit: 20, sort: '-updatedAt', where: { parent: { equals: id } } }).catch(() => ({ docs: [] })),
          p.find({ collection: 'agent-tasks', req, overrideAccess: false, depth: 0, limit: 50, where: { status: { equals: 'review' } } }).catch(() => ({ docs: [] })),
        ])
        const needle = new RegExp(`"${c.slug}"[^}]*"id"\\s*:\\s*"?${id}\\b|"id"\\s*:\\s*"?${id}"?[^}]*"${c.slug}"`)
        const proposals = (review.docs as Row[]).filter((t) => needle.test(JSON.stringify(t.proposal ?? '')))
        const title = titleOf(c, doc)
        const deletedAt = doc.deletedAt as string | null | undefined
        return (
          <>
            <Head title={title} sub={`${label(c)} · #${id} · ${tr(`pub.${String(doc._status ?? 'published')}`, String(doc._status ?? ''))}${deletedAt ? ` · ${tr('hist.inTrash', 'dans la corbeille')}` : ''}`}>
              <Link className="dl-btn" href="/admin/cockpit/historique">{tr('hist.back', 'Retour')}</Link>
              <Link className="dl-btn pri" href={`/admin/collections/${c.slug}/${id}`}>{tr('hist.edit', 'Modifier la fiche')}</Link>
            </Head>
            {deletedAt ? (
              <Section id="trash" title={tr('hist.inTrash.t', 'Dans la corbeille')} sub={`${tr('hist.left', 'Suppression définitive dans')} ${daysLeft(deletedAt)} ${tr('hist.days', 'jours')}.`} style={{ borderColor: 'var(--dl-wa)' }}>
                <Act path={`/api/${c.slug}/${id}?trash=true`} body={{ deletedAt: null }} label={tr('hist.restore', 'Restaurer')} className="dl-btn pri" />
              </Section>
            ) : null}
            {c.slug === 'places' && typeof doc.slug === 'string' ? (
              <Section id="preview" title={tr('hist.preview', 'Aperçu')} sub={tr('hist.preview.sub', 'La page publique, brouillon compris. Les noms, adresses et horaires ne sont jamais traduits.')}>
                <LangPreview slug={doc.slug} labels={{ lang: tr('ui.lang', 'Langue'), fr: 'Français', ar: 'العربية', en: 'English', open: tr('hist.newTab', 'Ouvrir dans un onglet'), title: title }} />
              </Section>
            ) : null}
            <Section id="prop" title={`${tr('hist.proposals', 'Propositions d’agents')} · ${proposals.length}`} sub={tr('hist.proposals.sub', 'Travail des agents qui concerne cette fiche et attend une validation.')}>
              {proposals.length === 0 ? <p className="dl-empty">{tr('hist.proposals.none', 'Aucune proposition en attente.')}</p> : (
                <ul style={{ margin: 0, paddingInlineStart: 18 }}>{proposals.map((t) => <li key={t.id}><Link href={`/admin/cockpit/validation#t${t.id}`}>#{t.id} {String(t.title)}</Link></li>)}</ul>
              )}
            </Section>
            <Section id="audit" title={`${tr('hist.journal', 'Journal des modifications')} · ${audit.docs.length}`} sub={tr('hist.journal.sub', 'Qui a fait quoi, quand. Chaque action d’agent porte son identifiant act_….')}>
              {audit.docs.length === 0 ? <p className="dl-empty">{tr('hist.journal.none', 'Aucune entrée.')}</p> : (
                <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {(audit.docs as Row[]).map((a) => {
                    const ch = (Array.isArray(a.changes) ? a.changes : []) as Change[]
                    return (
                      <li key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--dl-ln)', display: 'grid', gap: 4 }}>
                        <div className="dl-row dl-wr" style={{ gap: 8, fontSize: 13 }}>
                          <span className={a.actorKind === 'agent' ? 'dl-pill in' : 'dl-pill'}>{String(a.actorLabel ?? a.actorKind ?? '')}</span>
                          <b>{String(a.summary ?? a.action ?? '')}</b>
                          <span className="dl-mu" style={{ fontSize: 12 }}>{fmtDate(lang, a.createdAt)}</span>
                          {a.actionId ? <Link href={`/admin/cockpit/activite?q=${String(a.actionId)}`}><code style={{ fontSize: 11.5 }}>{String(a.actionId)}</code></Link> : null}
                        </div>
                        {ch.length ? (
                          <details><summary style={{ cursor: 'pointer', fontSize: 12.5 }}>{ch.length} {tr('hist.fields', 'champ(s) modifié(s)')}</summary>
                            <ul style={{ margin: '4px 0 0', paddingInlineStart: 18, fontSize: 12.5 }}>{ch.slice(0, 30).map((x, i) => <li key={i}><b>{x.field}</b> : <span className="dl-mu">{short(x.before)}</span> → {short(x.after)}</li>)}</ul>
                          </details>
                        ) : null}
                      </li>
                    )
                  })}
                </ol>
              )}
            </Section>
            <Section id="versions" title={`${tr('hist.versions', 'Versions')} · ${versions.docs.length}`} sub={tr('hist.versions.sub', 'Restaurer crée un brouillon à partir de la version choisie. La publication reste une décision de l’administrateur.')}>
              {versions.docs.length === 0 ? <p className="dl-empty">{tr('hist.versions.none', 'Aucune version enregistrée.')}</p> : (
                <table><thead><tr><th>{tr('hist.date', 'Date')}</th><th>{tr('hist.state', 'État')}</th><th /></tr></thead><tbody>
                  {(versions.docs as Array<Row & { version?: Row; latest?: boolean; updatedAt?: string }>).map((v, i) => (
                    <tr key={v.id}>
                      <td>{fmtDate(lang, v.updatedAt)}{v.latest || i === 0 ? <span className="dl-pill ok" style={{ marginInlineStart: 6 }}>{tr('hist.current', 'actuelle')}</span> : null}</td>
                      <td>{tr(`pub.${String(v.version?._status ?? '')}`, String(v.version?._status ?? ''))}</td>
                      <td style={{ textAlign: 'end' }}>{i > 0 ? <Act path={`/api/${c.slug}/versions/${v.id}?draft=true`} method="POST" label={tr('hist.restoreVersion', 'Restaurer en brouillon')} confirm={tr('hist.restoreVersion.confirm', 'Créer un brouillon à partir de cette version ?')} /> : null}</td>
                    </tr>
                  ))}
                </tbody></table>
              )}
            </Section>
            {isAdmin && !deletedAt && c.trash ? (
              <div><Act path={`/api/${c.slug}/${id}`} stampField="deletedAt" label={tr('hist.toTrash', 'Mettre à la corbeille')} className="dl-btn dan" confirm={`${tr('hist.toTrash.confirm', 'Mettre cette fiche à la corbeille ? Restaurable pendant')} ${TRASH_DAYS} ${tr('hist.days', 'jours')}.`} /></div>
            ) : null}
          </>
        )
      }

      // Vue d’ensemble : recherche, dernières modifications, corbeille.
      const search = q ? await Promise.all(cols.map(async (col) => ({ col, docs: (await p.find({ collection: col.slug as never, req, overrideAccess: false, depth: 0, limit: 8, where: { [col.admin!.useAsTitle!]: { like: q } } as Where })).docs as Row[] }))) : []
      const [recent, trashed] = await Promise.all([
        p.find({ collection: 'audit-log', req, overrideAccess: false, depth: 0, limit: 30, sort: '-createdAt', where: { target: { in: cols.map((x) => x.slug) } } }).catch(() => ({ docs: [] })),
        Promise.all(trashCollections(p).map(async (slug) => ({ col: byslug.get(slug) ?? ({ slug } as Col), docs: (await p.find({ collection: slug as never, req, overrideAccess: false, depth: 0, limit: 100, trash: true, sort: 'deletedAt', where: { deletedAt: { exists: true } } })).docs as Row[] }))),
      ])
      return (
        <>
          <Head title={tr('nav.historique', 'Historique et corbeille')} sub={tr('hist.sub', 'Retrouvez une fiche, son historique et ses versions. Une fiche supprimée reste 30 jours dans la corbeille.')} />
          <form className="dl-card dl-row dl-wr" style={{ gap: 8 }} role="search" action="/admin/cockpit/historique">
            <input className="dl-inp" name="q" defaultValue={q} placeholder={tr('hist.search', 'Nom de la fiche')} aria-label={tr('hist.search', 'Nom de la fiche')} style={{ flex: '1 1 240px' }} />
            <button className="dl-btn pri" type="submit">{tr('hist.find', 'Chercher')}</button>
          </form>
          {q ? (
            <Section id="res" title={tr('ui.cmd.results', 'Résultats')}>
              {search.every((s) => s.docs.length === 0) ? <p className="dl-empty">{tr('ui.cmd.none', 'Aucun résultat.')}</p> : search.filter((s) => s.docs.length).map((s) => (
                <div key={s.col.slug} style={{ marginBottom: 8 }}><b className="lbl">{label(s.col)}</b>
                  <ul style={{ margin: '4px 0 0', paddingInlineStart: 18 }}>{s.docs.map((d) => <li key={d.id}><Link href={`/admin/cockpit/historique?c=${s.col.slug}&id=${d.id}`}>{titleOf(s.col, d)}</Link></li>)}</ul>
                </div>
              ))}
            </Section>
          ) : null}
          <Section id="trash" title={`${tr('hist.trash', 'Corbeille')} · ${trashed.reduce((n, t) => n + t.docs.length, 0)}`} sub={`${tr('hist.trash.sub', 'Restaurable pendant')} ${TRASH_DAYS} ${tr('hist.days', 'jours')}. ${tr('hist.trash.sub2', 'Ensuite, la tâche quotidienne supprime la fiche définitivement.')}`}>
            {trashed.every((t) => t.docs.length === 0) ? <p className="dl-empty">{tr('hist.trash.none', 'La corbeille est vide.')}</p> : (
              <table><thead><tr><th>{tr('hist.fiche', 'Fiche')}</th><th>{tr('hist.left.col', 'Jours restants')}</th><th /></tr></thead><tbody>
                {trashed.flatMap((t) => t.docs.map((d) => (
                  <tr key={`${t.col.slug}-${d.id}`}>
                    <td><Link href={`/admin/cockpit/historique?c=${t.col.slug}&id=${d.id}`}>{titleOf(t.col, d)}</Link> <span className="dl-mu">· {label(t.col)}</span></td>
                    <td>{daysLeft(String(d.deletedAt))}</td>
                    <td style={{ textAlign: 'end' }}>
                      <span className="dl-row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                        <Act path={`/api/${t.col.slug}/${d.id}?trash=true`} body={{ deletedAt: null }} label={tr('hist.restore', 'Restaurer')} />
                        {isAdmin ? <Act path={`/api/${t.col.slug}/${d.id}?trash=true`} method="DELETE" label={tr('hist.purge', 'Supprimer définitivement')} className="dl-btn dan" confirm={tr('hist.purge.confirm', 'Supprimer définitivement cette fiche ? Cette action est irréversible.')} /> : null}
                      </span>
                    </td>
                  </tr>
                )))}
              </tbody></table>
            )}
          </Section>
          <Section id="recent" title={tr('hist.recent', 'Dernières modifications')}>
            {recent.docs.length === 0 ? <p className="dl-empty">{tr('hist.journal.none', 'Aucune entrée.')}</p> : (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {(recent.docs as Row[]).map((a) => (
                  <li key={a.id} className="dl-row dl-wr" style={{ gap: 8, padding: '7px 0', borderBottom: '1px solid var(--dl-ln)', fontSize: 13 }}>
                    <span className={a.actorKind === 'agent' ? 'dl-pill in' : 'dl-pill'}>{String(a.actorLabel ?? '')}</span>
                    <Link href={`/admin/cockpit/historique?c=${String(a.target)}&id=${String(a.targetId)}`}>{String(a.summary ?? a.action)}</Link>
                    <span className="dl-mu" style={{ fontSize: 12 }}>{fmtDate(lang, a.createdAt)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </>
      )
    }} />
  )
}
