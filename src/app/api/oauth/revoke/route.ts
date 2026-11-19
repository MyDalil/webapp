import { oauthJson, preflight } from '@/platform/oauth/server'
import { guard } from '@/platform/security/rateLimit'

/**
 * Révocation (RFC 7009) : répond toujours 200, sans rien stocker (jetons signés, pas de table).
 * Effet réel : le jeton d’accès expire en 1 h au plus. Révocation immédiate :
 * - d’un compte : changer son mot de passe, lui donner le rôle conseiller ou supprimer le compte invalide tous ses jetons ;
 * - de tout : changer OAUTH_KEY_VERSION dans Vercel puis redéployer.
 */
export async function POST() {
  const limited = await guard('oauth-revoke', 60, 600)
  if (limited) return limited
  return oauthJson({})
}
export const OPTIONS = preflight
