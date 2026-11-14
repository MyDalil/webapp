import Link from 'next/link'
import type { AdminViewServerProps, Where } from 'payload'
import { usageOf, usedMediaIds } from '@/platform/storage'
import { Act, TextAct } from './Act'
import { CockpitPage, fmtDate, Head, Section } from './CockpitPage'
import { FieldEditor } from './Forms'
import { FocalPicker, MediaDrop } from './MediaDrop'

type M = { id: number; alt?: string; altAr?: string | null; altEn?: string | null; credit?: string | null; url?: string; filename?: string; mimeType?: string; filesize?: number; width?: number; height?: number; focalX?: number; focalY?: number; hash?: string | null; moderation?: string; createdAt?: string; sizes?: Record<string, { url?: string | null; width?: number | null; height?: number | null; filesize?: number | null }> }
const FILTERS = ['all', 'to-check', 'untranslated', 'duplicates', 'unused'] as const
type Filter = (typeof FILTERS)[number]
const PER_PAGE = 48
const SIZE_W: Record<string, number> = { thumb: 480, card: 800, cover: 1600, og: 1200 }
const ko = (n?: number | null) => (n ? `${Math.round(n / 1024)} Ko` : '—')

/** Médiathèque : envoi par glisser-déposer, formats WebP, point focal, descriptions FR/AR/EN, doublons, remplacement partout. */
export function MediasView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} roles={['patron', 'admin', 'editor']} render={async ({ req, tr, lang, isAdmin }) => {
      const p = req.payload
      const sp = (props.searchParams ?? {}) as Record<string, string | undefined>
      const f: Filter = FILTERS.find((x) => x === sp.f) ?? 'all'
      const q = (sp.q ?? '').trim().slice(0, 80)
      const page = Math.max(1, Number(sp.page) || 1)
      const openId = Number(sp.id) || null

      const [hashes, used] = await Promise.all([
        p.find({ collection: 'media', req, overrideAccess: false, depth: 0, pagination: false, select: { hash: true } as never }),
        f === 'unused' ? usedMediaIds(req) : Promise.resolve(null),
      ])
      const count = new Map<string, number>()
      for (const d of hashes.docs as M[]) if (d.hash) count.set(d.hash, (count.get(d.hash) ?? 0) + 1)
      const dupHashes = [...count.entries()].filter(([, n]) => n > 1).map(([h]) => h)

      const and: Where[] = []
      if (q) and.push({ or: [{ alt: { like: q } }, { filename: { like: q } }, { credit: { like: q } }] })
      if (f === 'to-check') and.push({ moderation: { equals: 'to-check' } })
      if (f === 'untranslated') and.push({ or: [{ altAr: { exists: false } }, { altEn: { exists: false } }, { altAr: { equals: '' } }, { altEn: { equals: '' } }] })
      if (f === 'duplicates') and.push({ hash: { in: dupHashes.length ? dupHashes : ['-'] } })
      if (f === 'unused') and.push({ id: { not_in: used && used.size ? [...used].map(Number) : [0] } })
      const list = await p.find({ collection: 'media', req, overrideAccess: false, depth: 0, limit: PER_PAGE, page, sort: f === 'duplicates' ? 'hash' : '-createdAt', where: and.length ? { and } : undefined })
      const docs = list.docs as unknown as M[]
      const open = openId ? ((await p.find({ collection: 'media', req, overrideAccess: false, depth: 0, limit: 1, where: { id: { equals: openId } } })).docs[0] as unknown as M | undefined) : undefined
      const uses = open ? await usageOf(req, open.id) : []
      const href = (o: Record<string, string | number | null | undefined>) => {
        const s = new URLSearchParams()
        const all = { f: f === 'all' ? undefined : f, q: q || undefined, page: page > 1 ? page : undefined, ...o }
        for (const [k, v] of Object.entries(all)) if (v != null && v !== '') s.set(k, String(v))
        return `/admin/cockpit/medias${s.size ? `?${s}` : ''}`
      }
      const thumb = (m: M) => m.sizes?.thumb?.url ?? m.url ?? ''

      return (
        <>
          <Head title={tr('nav.medias', 'Médiathèque')} sub={tr('med.sub', 'Glissez vos photos. Chaque photo reçoit 4 formats en WebP, un point focal et une description en français, arabe et anglais.')}>
            <Link className="dl-btn" href="/admin/collections/media">{tr('ui.table', 'Vue tableau')}</Link>
          </Head>

          <Section id="up" title={tr('med.add', 'Ajouter des photos')} sub={tr('med.add.sub', 'JPEG, PNG, WebP ou AVIF. Au-delà de 4 Mo, la photo est réduite avant l’envoi. Un doublon est signalé avant l’envoi.')}>
            <MediaDrop labels={{ drop: tr('med.drop', 'Glissez des photos ici ou cliquez pour choisir'), dropHint: tr('med.dropHint', 'Plusieurs fichiers à la fois. Description en français obligatoire.'), queue: tr('med.queue', 'Photos à envoyer'), alt: tr('med.alt', 'Description (français)'), altAr: tr('med.altAr', 'Description (arabe)'), altEn: tr('med.altEn', 'Description (anglais)'), credit: tr('med.credit', 'Crédit photo'), dup: tr('med.dup', 'Déjà dans la médiathèque :'), sent: tr('med.sent', 'Envoyée'), send: tr('med.send', 'Envoyer'), clear: tr('med.clear', 'Retirer les envoyées'), remove: tr('med.remove', 'Retirer'), altRequired: tr('med.altRequired', 'Description en français obligatoire.'), network: tr('med.network', 'Réseau indisponible.') }} />
          </Section>

          {open ? (
            <section className="dl-card" aria-labelledby="det" style={{ display: 'grid', gap: 14 }}>
              <div className="dl-row dl-sb dl-wr"><h2 id="det">#{open.id} {open.alt}</h2><Link className="dl-btn" href={href({ id: null })}>{tr('ui.close', 'Fermer')}</Link></div>
              <div className="dl-medgrid2">
                <FocalPicker id={open.id} src={open.url ?? ''} x={open.focalX ?? 50} y={open.focalY ?? 50} label={tr('med.focal', 'Point focal : cliquez sur le sujet de la photo (ou flèches du clavier)')} saved={tr('med.focal.saved', 'formats recadrés')} />
                <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
                  <div><b className="lbl">{tr('med.alt', 'Description (français)')}</b><FieldEditor path={`/api/media/${open.id}`} field="alt" value={open.alt ?? ''} label={tr('med.alt', 'Description (français)')} save={tr('ui.save', 'Enregistrer')} rows={2} /></div>
                  <div><b className="lbl">{tr('med.altAr', 'Description (arabe)')}</b><FieldEditor path={`/api/media/${open.id}`} field="altAr" value={open.altAr ?? ''} label={tr('med.altAr', 'Description (arabe)')} save={tr('ui.save', 'Enregistrer')} rows={2} dir="rtl" /></div>
                  <div><b className="lbl">{tr('med.altEn', 'Description (anglais)')}</b><FieldEditor path={`/api/media/${open.id}`} field="altEn" value={open.altEn ?? ''} label={tr('med.altEn', 'Description (anglais)')} save={tr('ui.save', 'Enregistrer')} rows={2} /></div>
                  <div><b className="lbl">{tr('med.credit', 'Crédit photo')}</b><FieldEditor path={`/api/media/${open.id}`} field="credit" value={open.credit ?? ''} label={tr('med.credit', 'Crédit photo')} save={tr('ui.save', 'Enregistrer')} rows={1} /></div>
                </div>
              </div>
              <div>
                <b className="lbl">{tr('med.formats', 'Formats')}</b>
                <table><thead><tr><th>{tr('med.format', 'Format')}</th><th>{tr('med.size', 'Taille')}</th><th>{tr('med.weight', 'Poids')}</th></tr></thead><tbody>
                  <tr><td>{tr('med.original', 'Original')} · {open.mimeType}</td><td>{open.width ?? '—'} × {open.height ?? '—'}</td><td>{ko(open.filesize)}</td></tr>
                  {['thumb', 'card', 'cover', 'og'].map((k) => { const s = open.sizes?.[k]; return <tr key={k}><td>{tr(`med.size.${k}`, k)}</td><td>{s?.url ? `${s.width} × ${s.height}` : <span className="dl-mu">{tr('med.notmade', 'non produit')}{(open.width ?? 0) < SIZE_W[k] ? ` — ${tr('med.toosmall', 'photo plus petite que ce format')}` : ''}</span>}</td><td>{s?.url ? <a href={s.url} target="_blank" rel="noreferrer">{ko(s.filesize)}</a> : '—'}</td></tr> })}
                </tbody></table>
              </div>
              <div>
                <b className="lbl">{tr('med.uses', 'Utilisée dans')} · {uses.length}</b>
                {uses.length === 0 ? <p className="dl-mu" style={{ margin: '4px 0 0' }}>{tr('med.unused', 'Utilisée nulle part.')}</p> : (
                  <ul style={{ margin: '4px 0 0', paddingInlineStart: 18 }}>{uses.map((u) => <li key={`${u.collection}-${u.id}`}><Link href={`/admin/collections/${u.collection}/${u.id}`}>{u.title}</Link> <span className="dl-mu">· {u.collection}</span></li>)}</ul>
                )}
              </div>
              <div className="dl-row dl-wr" style={{ gap: 8, alignItems: 'flex-start' }}>
                {open.moderation === 'to-check' ? <Act path={`/api/media/${open.id}`} body={{ moderation: 'ok' }} label={tr('med.checked', 'Marquer contrôlée')} className="dl-btn pri" /> : null}
                {isAdmin && uses.length ? <div style={{ flex: '1 1 320px' }}><b className="lbl">{tr('med.replace', 'Remplacer partout par la photo n°')}</b><TextAct path="/api/medias/replace" method="POST" field="to" extra={{ from: open.id }} label={tr('med.replace.go', 'Remplacer')} placeholder={tr('med.replace.ph', 'Numéro de la nouvelle photo')} rows={1} /></div> : null}
                {isAdmin && !uses.length ? <Act path={`/api/media/${open.id}`} method="DELETE" label={tr('med.delete', 'Supprimer')} className="dl-btn dan" confirm={tr('med.delete.confirm', 'Supprimer définitivement cette photo ?')} /> : null}
              </div>
            </section>
          ) : null}

          <section className="dl-card" aria-label={tr('nav.medias', 'Médiathèque')} style={{ display: 'grid', gap: 12 }}>
            <div className="dl-row dl-sb dl-wr">
              <nav className="dl-seg" aria-label={tr('med.filter', 'Filtre')} style={{ flexWrap: 'wrap' }}>
                {FILTERS.map((x) => <Link key={x} href={href({ f: x === 'all' ? undefined : x, page: undefined, id: null })} aria-current={f === x ? 'page' : undefined} className={f === x ? 'on' : undefined}>{tr(`med.f.${x}`, x)}{x === 'duplicates' && dupHashes.length ? ` · ${dupHashes.length}` : ''}</Link>)}
              </nav>
              <form role="search" action="/admin/cockpit/medias" className="dl-row" style={{ gap: 6 }}>
                {f !== 'all' ? <input type="hidden" name="f" value={f} /> : null}
                <input className="dl-inp" name="q" defaultValue={q} placeholder={tr('med.search', 'Description, fichier ou crédit')} aria-label={tr('med.search', 'Description, fichier ou crédit')} />
                <button type="submit" className="dl-btn">{tr('act.filter', 'Filtrer')}</button>
              </form>
            </div>
            {docs.length === 0 ? <p className="dl-empty">{tr('med.none', 'Aucune photo.')}</p> : (
              <ul className="dl-medgrid" aria-label={tr('med.list', 'Photos')}>
                {docs.map((m) => (
                  <li key={m.id}>
                    <Link href={href({ id: m.id })} className="dl-med" aria-current={open?.id === m.id ? 'true' : undefined}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- vignette déjà réduite (480 px) */}
                      <img src={thumb(m)} alt={m.alt ?? ''} loading="lazy" style={{ objectPosition: `${m.focalX ?? 50}% ${m.focalY ?? 50}%` }} />
                      <span className="dl-med-t">{m.alt}</span>
                      <span className="dl-row dl-wr" style={{ gap: 4 }}>
                        {m.moderation === 'to-check' ? <span className="dl-pill wa">{tr('med.f.to-check', 'À contrôler')}</span> : null}
                        {!m.altAr || !m.altEn ? <span className="dl-pill">{tr('med.missingLang', 'AR/EN à compléter')}</span> : null}
                        {m.hash && (count.get(m.hash) ?? 0) > 1 ? <span className="dl-pill da">{tr('med.dupTag', 'Doublon')}</span> : null}
                      </span>
                      <span className="dl-mu" style={{ fontSize: 11.5 }}>#{m.id} · {fmtDate(lang, m.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {list.totalPages > 1 ? (
              <div className="dl-row" style={{ gap: 8, justifyContent: 'center' }}>
                {list.hasPrevPage ? <Link className="dl-btn" href={href({ page: page - 1, id: null })}>←</Link> : null}
                <span className="dl-mu">{page} / {list.totalPages}</span>
                {list.hasNextPage ? <Link className="dl-btn" href={href({ page: page + 1, id: null })}>→</Link> : null}
              </div>
            ) : null}
          </section>
        </>
      )
    }} />
  )
}
