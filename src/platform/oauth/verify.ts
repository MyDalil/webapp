import 'server-only'
import type { Principal } from '@/platform/actions/types'
import { safeEqual, staffPrincipal, userStamp, verifyAccess } from './core'
import { familyRevoked, loadUser, oauthConfig } from './server'

/**
 * CONTRAT (lot B2) : vérifie un jeton d’accès OAuth et renvoie le compte équipe, ou null.
 * Contrôles : signature HS256, usage « access », version de clé (OAUTH_KEY_VERSION), expiration, audience
 * (= serveur MCP admin) et émetteur ; puis le compte est relu dans Payload : rôle patron/admin/editor, non verrouillé,
 * mot de passe inchangé depuis l’autorisation.
 */
export async function verifyOAuthToken(token: string): Promise<Extract<Principal, { kind: 'staff' }> | null> {
  const cfg = oauthConfig()
  if (!cfg) return null
  const claims = verifyAccess(cfg, token)
  if (!claims || !Number.isInteger(claims.userId) || claims.userId <= 0) return null
  // Famille compromise (rafraîchissement ou code rejoué) : les jetons d’accès encore valides sont refusés aussi.
  if (claims.fam && (await familyRevoked(claims.fam))) return null
  const user = await loadUser(claims.userId)
  const principal = staffPrincipal(user)
  if (!principal || !user || !safeEqual(userStamp(cfg, user), claims.stamp)) return null
  return principal
}
