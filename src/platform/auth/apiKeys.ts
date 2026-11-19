import 'server-only'
import type { Principal } from '@/platform/actions/types'
import { PUBLIC, principalFromUser } from '@/platform/actions/context'
import { payload } from '@/platform/http'
import { verifyOAuthToken } from '@/platform/oauth/verify'
import { KEY_PREFIX, bearerOf, matchKey, parseKeys } from './apiKeyCore'

/**
 * Qui appelle ? Clé API nominative (DALIL_MCP_KEYS), sinon jeton OAuth (lot B2), sinon public.
 * Le rôle est relu en base à chaque appel : un compte rétrogradé ou supprimé perd ses droits aussitôt.
 */
export async function resolvePrincipal(req: Request): Promise<Principal> {
  const token = bearerOf(req.headers.get('authorization'))
  if (!token) return PUBLIC
  if (token.startsWith(KEY_PREFIX)) {
    const email = matchKey(token, parseKeys(process.env.DALIL_MCP_KEYS))
    if (!email) return PUBLIC
    try {
      const p = await payload()
      const { docs } = await p.find({ collection: 'users', where: { email: { equals: email } }, depth: 0, limit: 1, overrideAccess: true })
      const u = docs[0] as (typeof docs)[number] & { lockUntil?: string | null }
      if (!u || (u.lockUntil && new Date(u.lockUntil) > new Date())) return PUBLIC
      return principalFromUser({ ...u, collection: 'users' })
    } catch {
      return PUBLIC
    }
  }
  try {
    return (await verifyOAuthToken(token)) ?? PUBLIC
  } catch {
    return PUBLIC
  }
}
