import { createHash } from 'crypto'
import { sql } from '@payloadcms/db-postgres'
import { payload } from '@/platform/http'
import { TEAM, esc, layout, send, SITE } from '@/platform/mail'
import { hit } from '@/platform/security/rateLimit'

type Db = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
export type ErrorContext = { path?: string; method?: string; route?: string; routeType?: string }

/** Chiffres et identifiants retirés du message : une même erreur sur des fiches différentes = une seule ligne. */
const normalize = (m: string) => m.replace(/\b[0-9a-f]{8,}\b/gi, '…').replace(/\d+/g, 'N').slice(0, 300)

/**
 * Enregistre une erreur serveur (instrumentation.ts › onRequestError) : regroupement par empreinte,
 * compteur, réouverture si elle revient après « Résolue », alerte email à la première occurrence (20 alertes/h au plus).
 * Ne lève jamais : un journal en panne ne doit pas casser la page.
 */
export async function recordError(err: unknown, ctx: ErrorContext) {
  try {
    const e = err instanceof Error ? err : new Error(String(err))
    const message = (e.message || e.name || 'Erreur').slice(0, 500)
    const route = ctx.route ?? ctx.path ?? ''
    const fingerprint = createHash('sha256').update(`${e.name}|${normalize(message)}|${route}`).digest('hex').slice(0, 40)
    const digest = (e as { digest?: string }).digest ?? null
    const p = await payload()
    const { rows } = await (p.db as unknown as Db).drizzle.execute(sql`
      INSERT INTO error_logs (fingerprint, message, route, path, method, route_type, count, first_seen, last_seen, resolved, digest, stack, updated_at, created_at)
      VALUES (${fingerprint}, ${message}, ${route}, ${ctx.path ?? null}, ${ctx.method ?? null}, ${ctx.routeType ?? null}, 1, now(), now(), false, ${digest}, ${(e.stack ?? '').slice(0, 4000)}, now(), now())
      ON CONFLICT (fingerprint) DO UPDATE SET
        count = error_logs.count + 1, last_seen = now(), path = EXCLUDED.path, digest = EXCLUDED.digest,
        stack = EXCLUDED.stack, resolved = false, updated_at = now()
      RETURNING count, (xmax = 0) AS created`)
    const created = rows[0]?.created === true
    if (!created || (await hit('alerte-erreur', 'site', 20, 3600))) return
    await send(
      process.env.ERROR_ALERT_EMAIL || TEAM,
      `Erreur sur DALIL : ${message.slice(0, 80)}`,
      layout('Nouvelle erreur sur le site.', `<p><strong>${esc(message)}</strong></p><p>Route : ${esc(route || '—')} (${esc(ctx.method ?? '')})</p><p>Détails et suivi : ${SITE}/admin/collections/error-logs</p>`),
    )
  } catch (logError) {
    console.error('[erreurs] journal indisponible', logError)
  }
}
