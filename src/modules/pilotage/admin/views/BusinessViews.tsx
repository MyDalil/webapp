import Link from 'next/link'
import type { AdminViewServerProps, Where } from 'payload'
import { getCategoryWilayaCounts } from '@/modules/annuaire'
import { listMisses } from '@/modules/recherche'
import { SECTORS, WILAYAS } from '@/platform/referentiel/catalog'
import { Act } from './Act'
import { CockpitPage, fmtDate, Head, Section } from './CockpitPage'

type Row = Record<string, unknown> & { id: number }
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : '—')
const isProd = () => process.env.VERCEL_ENV === 'production'

function Kpi({ v, label, href }: { v: string | number; label: string; href?: string }) {
  const inner = <div><div className="dl-v">{v}</div><div className="dl-kl">{label}</div></div>
  return href ? <Link href={href} className="dl-card dl-kpi">{inner}</Link> : <div className="dl-card dl-kpi">{inner}</div>
}

/** Analytics : activité réelle du site sur 30 jours, tirée de la base (le trafic détaillé reste dans Vercel Analytics). */
export function AnalyticsView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} render={async ({ req, tr }) => {
      const p = req.payload
      const since = daysAgo(30)
      const dates = (collection: string, where?: Where) =>
        p.find({ collection: collection as never, req, overrideAccess: false, depth: 0, pagination: false, select: { createdAt: true } as never, where: { and: [{ createdAt: { greater_than_equal: since } }, ...(where ? [where] : [])] } })
          .then((r) => (r.docs as unknown as Array<{ createdAt: string }>).map((d) => d.createdAt.slice(0, 10)), () => [] as string[])
      const [sessions, members, ads, subs, misses] = await Promise.all([dates('visitor-sessions'), dates('members'), dates('classifieds', { example: { not_equals: true } }), dates('submissions'), listMisses(p, 30, 1000).catch(() => [])])
      const series = [
        { key: 'sessions', label: tr('an.sessions', 'Sessions visiteurs (parcours personnalisé)'), d: sessions },
        { key: 'members', label: tr('an.members', 'Comptes créés'), d: members },
        { key: 'ads', label: tr('an.ads', 'Annonces déposées'), d: ads },
        { key: 'subs', label: tr('an.subs', 'Demandes reçues'), d: subs },
      ]
      const days = Array.from({ length: 30 }, (_, i) => daysAgo(29 - i).slice(0, 10))
      return (
        <>
          <Head title={tr('nav.analytics', 'Analytics')} sub={tr('an.sub', 'Activité enregistrée dans la base sur 30 jours. Pages vues et visiteurs : Vercel › projet mydalil › Analytics.')} />
          <div className="dl-kpis">
            {series.map((s) => <Kpi key={s.key} v={s.d.length} label={s.label} />)}
            <Kpi v={misses.reduce((n, m) => n + m.count, 0)} label={tr('an.misses', 'Recherches sans résultat')} href="/admin/cockpit/recherches" />
          </div>
          <Section id="days" title={tr('an.perDay', 'Par jour (30 jours)')}>
            <div className="dl-scroll">
              <table style={{ minWidth: 560 }} aria-label={tr('an.perDay', 'Par jour (30 jours)')}>
                <thead><tr><th>{tr('hist.date', 'Date')}</th>{series.map((s) => <th key={s.key}>{s.label}</th>)}</tr></thead>
                <tbody>{[...days].reverse().map((d) => <tr key={d}><td>{d}</td>{series.map((s) => <td key={s.key}>{s.d.filter((x) => x === d).length || ''}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </Section>
        </>
      )
    }} />
  )
}

/** Newsletter : abonnés (confirmés, en attente, désinscrits, origine) et campagnes. */
export function NewsletterView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} roles={['patron', 'admin', 'editor']} render={async ({ req, tr, lang }) => {
      const p = req.payload
      const [subs, campaigns] = await Promise.all([
        p.find({ collection: 'subscribers', req, overrideAccess: false, depth: 0, pagination: false, select: { source: true, confirmedAt: true, unsubscribedAt: true } as never }),
        p.find({ collection: 'campaigns', req, overrideAccess: false, depth: 0, limit: 30, sort: '-createdAt' }),
      ])
      const all = subs.docs as unknown as Array<{ source?: string; confirmedAt?: string; unsubscribedAt?: string }>
      const active = all.filter((s) => s.confirmedAt && !s.unsubscribedAt).length
      const pending = all.filter((s) => !s.confirmedAt && !s.unsubscribedAt).length
      const gone = all.filter((s) => s.unsubscribedAt).length
      const bySource = new Map<string, number>()
      for (const s of all) if (s.confirmedAt && !s.unsubscribedAt) bySource.set(s.source ?? '—', (bySource.get(s.source ?? '—') ?? 0) + 1)
      return (
        <>
          <Head title={tr('nav.newsletter', 'Newsletter')} sub={tr('nl.sub', 'Envoi seulement aux abonnés confirmés (double validation). Désinscription en un clic dans chaque email.')}>
            <Link className="dl-btn pri" href="/admin/collections/campaigns/create">{tr('nl.new', 'Nouvelle campagne')}</Link>
          </Head>
          <div className="dl-kpis">
            <Kpi v={active} label={tr('nl.active', 'Abonnés confirmés')} href="/admin/collections/subscribers" />
            <Kpi v={pending} label={tr('nl.pending', 'En attente de confirmation')} />
            <Kpi v={gone} label={tr('nl.gone', 'Désinscrits')} />
            <Kpi v={pct(active, active + gone)} label={tr('nl.retention', 'Restent abonnés')} />
          </div>
          <div className="dl-cols">
            <Section id="src" title={tr('nl.sources', 'Origine des abonnés confirmés')}>
              {bySource.size === 0 ? <p className="dl-empty">—</p> : <ul style={{ margin: 0, paddingInlineStart: 18 }}>{[...bySource.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => <li key={k}>{k} · <b>{n}</b></li>)}</ul>}
            </Section>
            <Section id="camp" title={`${tr('nl.campaigns', 'Campagnes')} · ${campaigns.totalDocs}`}>
              {campaigns.docs.length === 0 ? <p className="dl-empty">{tr('nl.none', 'Aucune campagne.')}</p> : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{(campaigns.docs as unknown as Row[]).map((c) => <li key={c.id} className="dl-row dl-sb dl-wr" style={{ gap: 8, padding: '7px 0', borderBottom: '1px solid var(--dl-ln)' }}><Link href={`/admin/collections/campaigns/${c.id}`}>{String(c.subject ?? c.title ?? `#${c.id}`)}</Link><span className={c.sentAt ? 'dl-pill ok' : 'dl-pill'}>{c.sentAt ? `${tr('nl.sent', 'Envoyée')} ${fmtDate(lang, c.sentAt)} · ${String(c.recipients ?? 0)}` : tr('nl.draft', 'Brouillon')}</span></li>)}</ul>
              )}
            </Section>
          </div>
        </>
      )
    }} />
  )
}

/** Finances : packs et demandes d’accompagnement. Aucun paiement n’est branché : montants potentiels seulement. */
export function FinancesView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} render={async ({ req, tr }) => {
      const p = req.payload
      const [packs, requests] = await Promise.all([
        p.find({ collection: 'packs', req, overrideAccess: false, depth: 0, limit: 100, sort: 'order' }),
        p.find({ collection: 'demandes-accompagnement', req, overrideAccess: false, depth: 0, pagination: false, select: { pack: true, persons: true, status: true } as never }),
      ])
      const byId = new Map((packs.docs as unknown as Row[]).map((x) => [x.id, x]))
      const STATUSES = ['attente', 'a-contacter', 'en-cours', 'terminee', 'annulee']
      const agg = new Map<string, { n: number; eur: number }>(STATUSES.map((s) => [s, { n: 0, eur: 0 }]))
      for (const r of requests.docs as unknown as Row[]) {
        const pk = byId.get(Number(typeof r.pack === 'object' && r.pack ? (r.pack as Row).id : r.pack))
        const eur = pk ? Number(pk.priceEur) * (pk.perPerson ? Math.max(1, Number(r.persons) || 1) : 1) : 0
        const a = agg.get(String(r.status)) ?? { n: 0, eur: 0 }
        agg.set(String(r.status), { n: a.n + 1, eur: a.eur + (Number.isFinite(eur) ? eur : 0) })
      }
      const eur = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`
      const open = ['attente', 'a-contacter', 'en-cours'].reduce((n, s) => n + (agg.get(s)?.eur ?? 0), 0)
      return (
        <>
          <Head title={tr('nav.finances', 'Finances')} sub={tr('fin.sub', 'Aucun paiement n’est branché : DALIL n’encaisse rien pour l’instant. Les montants ci-dessous sont des valeurs potentielles, calculées sur les prix des packs.')} />
          <div className="dl-kpis">
            <Kpi v="0 €" label={tr('fin.cashed', 'Encaissé (paiement non branché)')} />
            <Kpi v={eur(open)} label={tr('fin.open', 'Valeur des demandes ouvertes')} href="/admin/collections/demandes-accompagnement" />
            <Kpi v={eur(agg.get('terminee')?.eur ?? 0)} label={tr('fin.done', 'Valeur des accompagnements terminés')} />
            <Kpi v={requests.docs.length} label={tr('fin.requests', 'Demandes d’accompagnement')} />
          </div>
          <div className="dl-cols">
            <Section id="pipe" title={tr('fin.pipe', 'Demandes par étape')}>
              <table><thead><tr><th>{tr('hist.state', 'État')}</th><th>{tr('fin.count', 'Nombre')}</th><th>{tr('fin.value', 'Valeur potentielle')}</th></tr></thead><tbody>
                {STATUSES.map((s) => <tr key={s}><td>{tr(`acc.${s}`, s)}</td><td>{agg.get(s)?.n ?? 0}</td><td>{eur(agg.get(s)?.eur ?? 0)}</td></tr>)}
              </tbody></table>
            </Section>
            <Section id="packs" title={`${tr('fin.packs', 'Packs')} · ${packs.docs.length}`} action={<Link href="/admin/collections/packs" style={{ fontSize: 12.5 }}>{tr('pv.all', 'Tout voir')}</Link>}>
              <table><thead><tr><th>{tr('fin.pack', 'Pack')}</th><th>€</th><th>DA</th></tr></thead><tbody>
                {(packs.docs as unknown as Row[]).map((x) => <tr key={x.id}><td><Link href={`/admin/collections/packs/${x.id}`}>{String(x.title)}</Link>{x.active ? null : <span className="dl-pill" style={{ marginInlineStart: 6 }}>{tr('fin.inactive', 'inactif')}</span>}{x.perPerson ? <span className="dl-mu" style={{ fontSize: 12 }}> · {tr('fin.perPerson', 'par personne')}</span> : null}</td><td>{x.priceEur != null ? String(x.priceEur) : '—'}</td><td>{x.priceDa != null ? Number(x.priceDa).toLocaleString('fr-FR') : '—'}</td></tr>)}
              </tbody></table>
            </Section>
          </div>
        </>
      )
    }} />
  )
}

/** SEO : contenus indexables, fiches à compléter, robots et plan du site. */
export function SeoView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} render={async ({ req, tr }) => {
      const p = req.payload
      const n = (collection: string, where: Where) => p.count({ collection: collection as never, req, overrideAccess: false, where }).then((r) => r.totalDocs, () => 0)
      const pub: Where = { _status: { equals: 'published' } }
      const [places, noIntro, noPhoto, placeholder, pros, ads, procedures] = await Promise.all([
        n('places', { and: [pub, { slug: { exists: true } }] }),
        n('places', { and: [pub, { or: [{ intro: { exists: false } }, { intro: { equals: '' } }] }] }),
        n('places', { and: [pub, { photos: { exists: false } }] }),
        n('places', { and: [pub, { name: { like: 'nom à compléter' } }] }),
        n('providers', { status: { equals: 'published' } }),
        n('classifieds', { and: [{ status: { equals: 'published' } }, { example: { not_equals: true } }] }),
        n('procedures', {}),
      ])
      return (
        <>
          <Head title={tr('nav.seo', 'SEO')} sub={tr('seo.sub', 'Ce que Google peut indexer, et les fiches qui gagneraient à être complétées. Le plan du site se calcule à la lecture (contenus publiés seulement).')}>
            <a className="dl-btn" href="/sitemap.xml" target="_blank" rel="noreferrer">sitemap.xml</a>
            <a className="dl-btn" href="/robots.txt" target="_blank" rel="noreferrer">robots.txt</a>
          </Head>
          <Section id="idx" title={tr('seo.indexing', 'Indexation')}>
            <span className={isProd() ? 'dl-pill ok' : 'dl-pill wa'} style={{ whiteSpace: 'normal' }}>{isProd() ? tr('seo.prod', 'Production : site ouvert aux moteurs, espaces privés exclus.') : tr('seo.notprod', 'Hors production : tout est bloqué aux moteurs (robots.txt). Normal sur preview.')}</span>
          </Section>
          <div className="dl-kpis">
            <Kpi v={places.toLocaleString('fr-FR')} label={tr('seo.places', 'Adresses publiées')} />
            <Kpi v={pros} label={tr('seo.pros', 'Professionnels publiés')} />
            <Kpi v={ads} label={tr('seo.ads', 'Annonces publiées (hors exemples)')} />
            <Kpi v={procedures} label={tr('seo.procedures', 'Démarches')} />
          </div>
          <Section id="todo" title={tr('seo.todo', 'Adresses à compléter')} sub={tr('seo.todo.sub', 'Une présentation et une photo améliorent la page et son référencement. Jamais d’information inventée : une donnée sans source reste « à vérifier ».')}>
            <table><tbody>
              <tr><td>{tr('seo.noIntro', 'Sans présentation')}</td><td><b>{noIntro.toLocaleString('fr-FR')}</b> · {pct(noIntro, places)}</td></tr>
              <tr><td>{tr('seo.noPhoto', 'Sans photo')}</td><td><b>{noPhoto.toLocaleString('fr-FR')}</b> · {pct(noPhoto, places)}</td></tr>
              <tr><td>{tr('seo.placeholder', 'Nom provisoire « nom à compléter » (exclu du plan du site)')}</td><td><b>{placeholder.toLocaleString('fr-FR')}</b></td></tr>
            </tbody></table>
          </Section>
        </>
      )
    }} />
  )
}

/** Couverture : adresses publiées par wilaya, secteurs couverts ; filtre par secteur pour voir les manques. */
export function CouvertureView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} roles={['patron', 'admin', 'editor']} render={async ({ tr }) => {
      const sp = (props.searchParams ?? {}) as Record<string, string | undefined>
      const sector = SECTORS.find((s) => s.slug === sp.s)?.slug
      const rows = await getCategoryWilayaCounts()
      const live = new Set(rows.map((r) => r.sector))
      const per = new Map<string, { total: number; sectors: Set<string>; inSector: number }>()
      for (const w of WILAYAS) per.set(String(w.code), { total: 0, sectors: new Set(), inSector: 0 })
      for (const r of rows) {
        const x = r.wilaya ? per.get(r.wilaya) : undefined
        if (!x) continue
        x.total += r.n
        x.sectors.add(r.sector)
        if (r.sector === sector) x.inSector += r.n
      }
      const list = WILAYAS.map((w) => ({ w, ...per.get(String(w.code))! })).sort((a, b) => (sector ? a.inSector - b.inSector : a.total - b.total))
      const empty = list.filter((x) => (sector ? x.inSector : x.total) === 0).length
      return (
        <>
          <Head title={tr('nav.couverture', 'Couverture')} sub={tr('cov.sub', 'Adresses publiées par wilaya, des moins couvertes aux plus couvertes. Choisissez un secteur pour voir les manques.')} />
          <form className="dl-card dl-row dl-wr" style={{ gap: 8 }} action="/admin/cockpit/couverture">
            <select className="dl-inp" name="s" defaultValue={sector ?? ''} aria-label={tr('cov.sector', 'Secteur')} style={{ flex: '1 1 260px' }}>
              <option value="">{tr('cov.all', 'Tous les secteurs')}</option>
              {SECTORS.filter((s) => live.has(s.slug)).map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
            </select>
            <button className="dl-btn pri" type="submit">{tr('act.filter', 'Filtrer')}</button>
          </form>
          <p className="dl-mu" style={{ margin: 0 }}>{empty} / {WILAYAS.length} {tr('cov.empty', 'wilayas sans aucune adresse publiée')}{sector ? ` ${tr('cov.inSector', 'dans ce secteur')}` : ''}.</p>
          <section className="dl-card dl-scroll" aria-label={tr('nav.couverture', 'Couverture')}>
            <table style={{ minWidth: 420 }}><thead><tr><th>{tr('cov.wilaya', 'Wilaya')}</th>{sector ? <th>{tr('cov.inSectorCol', 'Dans le secteur')}</th> : null}<th>{tr('cov.total', 'Adresses')}</th><th>{tr('cov.sectors', 'Secteurs couverts')}</th></tr></thead><tbody>
              {list.map((x) => (
                <tr key={x.w.code}>
                  <td>{String(x.w.code).padStart(2, '0')} · {x.w.name}</td>
                  {sector ? <td><span className={x.inSector ? 'dl-pill' : 'dl-pill da'}>{x.inSector}</span></td> : null}
                  <td>{x.total.toLocaleString('fr-FR')}</td>
                  <td>{x.sectors.size} / {live.size}</td>
                </tr>
              ))}
            </tbody></table>
          </section>
        </>
      )
    }} />
  )
}

/** Traductions : couverture arabe et anglaise des contenus traduisibles. Les noms, adresses et horaires ne se traduisent jamais. */
export function TraductionsView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} roles={['patron', 'admin', 'editor']} render={async ({ req, tr }) => {
      const p = req.payload
      const n = (collection: string, where?: Where) => p.count({ collection: collection as never, req, overrideAccess: false, where }).then((r) => r.totalDocs, () => 0)
      const filled = (f: string): Where => ({ and: [{ [f]: { exists: true } }, { [f]: { not_equals: '' } }] })
      const pub: Where = { _status: { equals: 'published' } }
      const [places, nameAr, nameEn, media, altAr, altEn] = await Promise.all([
        n('places', pub), n('places', { and: [pub, filled('nameAr')] }), n('places', { and: [pub, filled('nameEn')] }),
        n('media'), n('media', filled('altAr')), n('media', filled('altEn')),
      ])
      const rows = [
        { label: tr('tr.placeAr', 'Adresses : nom en écriture arabe'), a: nameAr, b: places },
        { label: tr('tr.placeEn', 'Adresses : nom usuel en anglais'), a: nameEn, b: places },
        { label: tr('tr.altAr', 'Photos : description en arabe'), a: altAr, b: media, href: '/admin/cockpit/medias?f=untranslated' },
        { label: tr('tr.altEn', 'Photos : description en anglais'), a: altEn, b: media, href: '/admin/cockpit/medias?f=untranslated' },
      ]
      return (
        <>
          <Head title={tr('nav.traductions', 'Traductions')} sub={tr('tr.sub', 'Couverture des contenus en arabe et en anglais. Les noms, adresses et horaires ne sont jamais traduits : un nom arabe est sa graphie, pas une traduction.')} />
          <Section id="cov" title={tr('tr.coverage', 'Couverture')}>
            <ul className="dl-bars" aria-label={tr('tr.coverage', 'Couverture')}>
              {rows.map((r) => (
                <li key={r.label}><span className="dl-bars-k">{r.href ? <Link href={r.href}>{r.label}</Link> : r.label}</span><span className="dl-meter"><span style={{ width: r.b ? `${(r.a / r.b) * 100}%` : '0%' }} /></span><span className="dl-bars-v">{r.a.toLocaleString('fr-FR')} / {r.b.toLocaleString('fr-FR')} · {pct(r.a, r.b)}</span></li>
              ))}
            </ul>
          </Section>
          <Section id="tool" title={tr('tr.agent', 'Traduction par agent')}>
            <p style={{ margin: 0 }}><span className="dl-pill wa">{tr('con.notwired', 'non branché')}</span> {tr('tr.agent.sub', 'L’outil « translate » des agents répond « non branché » et ne fait rien. Toute traduction reste relue par l’équipe avant publication.')}</p>
          </Section>
        </>
      )
    }} />
  )
}

/** Recherches sans résultat (30 jours) : ce que les visiteurs veulent et que DALIL n’a pas encore. */
export function RecherchesView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} render={async ({ req, tr, lang }) => {
      const misses = await listMisses(req.payload, 30, 100).catch(() => [])
      return (
        <>
          <Head title={tr('nav.recherches', 'Recherches sans résultat')} sub={tr('rs.sub', '30 derniers jours, les plus fréquentes d’abord. Texte seul : une recherche avec un email ou un numéro n’est jamais gardée. Conservation 90 jours.')} />
          <section className="dl-card" aria-label={tr('nav.recherches', 'Recherches sans résultat')}>
            {misses.length === 0 ? <p className="dl-empty">{tr('rs.none', 'Aucune recherche sans résultat sur 30 jours.')}</p> : (
              <div className="dl-scroll"><table style={{ minWidth: 520 }}><thead><tr><th>{tr('rs.query', 'Recherche')}</th><th>{tr('rs.count', 'Fois')}</th><th>{tr('rs.last', 'Dernière')}</th><th /></tr></thead><tbody>
                {misses.map((m) => (
                  <tr key={m.q}>
                    <td><b>{m.q}</b></td><td>{m.count}</td><td>{fmtDate(lang, m.lastAt)}</td>
                    <td style={{ textAlign: 'end' }}><Act path="/api/agent-tasks" method="POST" body={{ title: `Combler une recherche sans résultat : « ${m.q} »`.slice(0, 160), instructions: `Des visiteurs cherchent « ${m.q} » (${m.count} fois en 30 jours) et DALIL ne trouve rien. Propose les fiches, catégories ou synonymes à ajouter, avec sources. Ne publie rien : propose.`, status: 'new', priority: 'normal' }} label={tr('rs.task', 'Confier à un agent')} /></td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
          </section>
        </>
      )
    }} />
  )
}
