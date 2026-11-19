import 'server-only'
import type { Payload, Where } from 'payload'
import { duplicatePairs, type Known } from './csv'

/** Variables indispensables (noms seulement, jamais les valeurs). */
export const CRITICAL_ENV = ['PAYLOAD_SECRET', 'CRON_SECRET', 'DALIL_DATABASE_URL', 'BLOB_READ_WRITE_TOKEN', 'RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET', 'BACKUP_SECRET', 'ANTHROPIC_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'OAUTH_SECRET', 'REMOTE_SIGNING_SECRET'] as const

/** Variables utiles seulement en production (tâches planifiées, sauvegarde, webhooks Resend) : jamais signalées sur un preview. */
const PRODUCTION_ONLY = new Set(['CRON_SECRET', 'BACKUP_SECRET', 'RESEND_WEBHOOK_SECRET'])

/** Variables absentes, sans fausse alerte : le secret du webhook Telegram se dérive de REMOTE_SIGNING_SECRET. */
export function missingEnv(env: Record<string, string | undefined> = process.env): string[] {
  const production = env.VERCEL_ENV === 'production'
  const has = (k: string) => Boolean(env[k]?.trim())
  return CRITICAL_ENV.filter((k) => {
    if (has(k)) return false
    if (!production && PRODUCTION_ONLY.has(k)) return false
    if (k === 'TELEGRAM_WEBHOOK_SECRET' && (env.REMOTE_SIGNING_SECRET?.trim().length ?? 0) >= 32) return false
    return true
  })
}

const empty = (f: string): Where => ({ or: [{ [f]: { exists: false } }, { [f]: { equals: '' } }] })
const published: Where = { _status: { equals: 'published' } }

/** Nombre de clés MCP déclarées (une par ligne non vide de DALIL_MCP_KEYS). Jamais les valeurs. */
export const mcpKeyCount = (v = process.env.DALIL_MCP_KEYS) => (v ?? '').split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#')).length

async function sample(payload: Payload, where: Where) {
  const r = await payload.find({ collection: 'places', where, limit: 10, depth: 0, overrideAccess: true, select: { name: true, city: true } })
  return { total: r.totalDocs, exemples: (r.docs as unknown as { id: number; name: string; city?: string }[]).map((d) => ({ id: d.id, name: d.name, city: d.city ?? null })) }
}

const safe = async <T>(f: () => Promise<T>): Promise<T | { erreur: string }> => {
  try {
    return await f()
  } catch (e) {
    return { erreur: (e as Error).message.slice(0, 160) }
  }
}

/** Contrôle de sécurité en une commande. Lecture seule. */
export async function securityReport(payload: Payload) {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const [sansTelephone, sansAdresse, sansCoordonnees, doublons, photosSansAlt, mediasAControler, erreurs, sauvegarde, equipe] = await Promise.all([
    safe(() => sample(payload, { and: [published, empty('phone')] })),
    safe(() => sample(payload, { and: [published, empty('address')] })),
    safe(() => sample(payload, { and: [published, { or: [{ lat: { exists: false } }, { lng: { exists: false } }] }] })),
    safe(async () => {
      const r = await payload.find({ collection: 'places', where: published, limit: 100000, pagination: false, depth: 0, overrideAccess: true, select: { name: true, city: true, phone: true, lat: true, lng: true } })
      const pairs = duplicatePairs(r.docs as unknown as Known[], 30)
      return { examines: r.docs.length, paires: pairs.map((p) => ({ a: { id: p.a.id, name: p.a.name }, b: { id: p.b.id, name: p.b.name }, raison: p.reason, distanceM: p.distanceM })) }
    }),
    safe(async () => (await payload.count({ collection: 'media', where: empty('alt'), overrideAccess: true })).totalDocs),
    safe(async () => (await payload.count({ collection: 'media', where: { moderation: { equals: 'to-check' } }, overrideAccess: true })).totalDocs),
    safe(async () => {
      const r = await payload.find({ collection: 'error-logs', where: { and: [{ lastSeen: { greater_than: since } }, { resolved: { not_equals: true } }] }, sort: '-lastSeen', limit: 10, depth: 0, overrideAccess: true })
      return { total: r.totalDocs, dernieres: (r.docs as unknown as { message: string; count?: number; lastSeen?: string }[]).map((d) => ({ message: d.message.slice(0, 160), occurrences: d.count ?? 1, derniereFois: d.lastSeen ?? null })) }
    }),
    safe(async () => {
      const r = await payload.find({ collection: 'task-runs', where: { name: { equals: 'sauvegarde' } }, sort: '-startedAt', limit: 5, depth: 0, overrideAccess: true })
      const runs = r.docs as unknown as { status: string; startedAt?: string; finishedAt?: string; error?: string | null }[]
      const ok = runs.find((x) => x.status === 'succeeded')
      const hours = ok?.finishedAt ? Math.round((Date.now() - Date.parse(ok.finishedAt)) / 3_600_000) : null
      return { derniereReussie: ok?.finishedAt ?? null, ilYaHeures: hours, enRetard: hours == null || hours > 36, dernierEtat: runs[0]?.status ?? null, derniereErreur: runs.find((x) => x.status === 'failed')?.error?.slice(0, 160) ?? null }
    }),
    safe(async () => {
      const r = await payload.find({ collection: 'users', limit: 200, depth: 0, overrideAccess: true, pagination: false })
      return (r.docs as unknown as { id: number; name?: string; role?: string }[]).map((u) => ({ id: u.id, nom: u.name ?? '', role: u.role ?? 'inconnu' }))
    }),
  ])
  return {
    genereLe: new Date().toISOString(),
    fiches: { sansTelephone, sansAdresse, sansCoordonnees, doublons },
    medias: { photosSansTexteAlternatif: photosSansAlt, aControler: mediasAControler },
    erreursRecentes7j: erreurs,
    // Les sauvegardes tournent en production seulement (tâche quotidienne) : un preview ne doit pas alerter.
    sauvegarde: process.env.VERCEL_ENV === 'production' ? sauvegarde : { horsProduction: true },
    clesMcpDeclarees: mcpKeyCount(),
    variablesAbsentes: missingEnv(),
    equipe,
  }
}
