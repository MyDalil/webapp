import 'server-only'
import { ActionError } from '@/platform/actions'
import { clientId, guard, hit, tooMany } from '@/platform/security/rateLimit'
import { CORS } from './http'

/**
 * Limites de débit MCP (table rate_limits).
 * - public : 600 unités/min par IP ; chaque requête compte 1 et chaque tools/call 1 de plus (un lot de 10 appels = 11).
 * - admin : 600 requêtes/min par IP avant authentification (large), puis 120 unités/min PAR COMPTE (requête + tools/call).
 * Les lots restent bornés à 10 messages (MAX_BATCH).
 */
export const LIMITS = { publicPerIp: 600, adminPerIp: 600, adminPerAccount: 120, windowSec: 60 } as const

const withCors = (r: Response) => {
  for (const [k, v] of Object.entries(CORS)) r.headers.set(k, v)
  return r
}

/** Limite par IP d’une requête ; réponse 429 prête (avec CORS) ou null. */
export async function ipLimit(bucket: string, max: number) {
  const limited = await guard(bucket, max, LIMITS.windowSec)
  return limited ? withCors(limited) : null
}

/** Compte une unité de plus pour `who` ; au-delà du plafond, l’appel d’outil est refusé (erreur d’outil lisible). */
export async function countCall(bucket: string, who: string, max: number) {
  const wait = await hit(bucket, who, max, LIMITS.windowSec)
  if (wait) throw new ActionError('forbidden', `Trop d’appels. Réessayez dans ${wait} secondes.`)
}

/** Limite par compte d’une requête authentifiée ; réponse 429 ou null. */
export async function accountLimit(userId: number) {
  const wait = await hit('mcp-admin-compte', `user:${userId}`, LIMITS.adminPerAccount, LIMITS.windowSec)
  if (!wait) return null
  return withCors(tooMany(wait))
}

export { clientId }
