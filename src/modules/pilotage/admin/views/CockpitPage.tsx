import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps, PayloadRequest } from 'payload'
import type { ReactNode } from 'react'
import { asLang, t, type Lang } from '../i18n'

export type Role = 'patron' | 'admin' | 'editor' | 'conseiller'
export type PageCtx = { req: PayloadRequest; lang: Lang; tr: ReturnType<typeof t>; role: Role; isAdmin: boolean; userName: string }

/**
 * Gabarit d’un écran du cockpit (/admin/cockpit/…). Payload n’applique ni son gabarit ni son contrôle d’accès
 * aux vues personnalisées à deux segments : ce gabarit les ajoute (connexion obligatoire, rôle vérifié).
 */
export async function CockpitPage(props: AdminViewServerProps & { roles?: Role[]; render: (ctx: PageCtx) => Promise<ReactNode> | ReactNode }) {
  const { initPageResult, params, searchParams, roles = ['patron', 'admin'], render } = props
  const { req, permissions, visibleEntities, locale } = initPageResult
  const user = req.user as { collection?: string; role?: Role; name?: string } | null
  if (!user || user.collection !== 'users') redirect('/admin/login')
  const lang = asLang(req.i18n?.language)
  const tr = t(lang)
  const role = (user.role ?? 'editor') as Role
  const allowed = roles.includes(role)
  return (
    <DefaultTemplate i18n={req.i18n} locale={locale} params={params} payload={req.payload} permissions={permissions} req={req} searchParams={searchParams} user={req.user ?? undefined} visibleEntities={visibleEntities}>
      <div className="dl dl-pv">
        {allowed ? await render({ req, lang, tr, role, isAdmin: role === 'patron' || role === 'admin', userName: String(user.name ?? '') }) : <p className="dl-empty">{tr('ui.forbidden', 'Accès réservé à Saïd et aux administrateurs.')}</p>}
      </div>
    </DefaultTemplate>
  )
}

/** Titre d’écran + texte court (règle UI DALIL : chaque section a un titre et un petit texte). */
export function Head({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
  return (
    <div className="dl-row dl-sb dl-wr" style={{ gap: 14 }}>
      <div><h1>{title}</h1><p className="dl-sub">{sub}</p></div>
      {children ? <div className="dl-row dl-wr" style={{ gap: 8 }}>{children}</div> : null}
    </div>
  )
}

export function Section({ id, title, sub, action, children, style }: { id: string; title: string; sub?: string; action?: ReactNode; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <section className="dl-card" aria-labelledby={id} style={style}>
      <div className="dl-row dl-sb dl-wr"><h2 id={id}>{title}</h2>{action}</div>
      {sub ? <p className="dl-sub">{sub}</p> : null}
      <div style={{ marginTop: 10 }}>{children}</div>
    </section>
  )
}

export const STATUS_PILL: Record<string, string> = {
  active: 'dl-pill ok dl-live', reserve: 'dl-pill', paused: 'dl-pill wa', disabled: 'dl-pill',
  new: 'dl-pill in', running: 'dl-pill ok dl-live', review: 'dl-pill wa', done: 'dl-pill ok', cancelled: 'dl-pill', failed: 'dl-pill da',
  before: 'dl-pill in', during: 'dl-pill ok', after: 'dl-pill', order: 'dl-pill wa',
}

export const fmtDate = (lang: Lang, d: unknown) =>
  d ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(String(d))) : ''

export const usd = (micros: unknown) => `${((Number(micros) || 0) / 1_000_000).toFixed(2)} $`
