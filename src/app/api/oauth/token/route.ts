import { exchange } from '@/platform/oauth/core'
import { consumeOnce, disabled, familyRevoked, loadUser, revokeFamily, oauthConfig, oauthJson, preflight, readParams } from '@/platform/oauth/server'
import { guard } from '@/platform/security/rateLimit'

/** Point de jeton OAuth 2.1 : authorization_code (PKCE S256) et refresh_token (rotation, usage unique). */
export async function POST(req: Request) {
  const cfg = oauthConfig()
  if (!cfg) return disabled()
  const limited = await guard('oauth-token', 60, 600)
  if (limited) return limited
  const params = await readParams(req)
  if (!params) return oauthJson({ error: 'invalid_request', error_description: 'Corps illisible.' }, 400)
  const { status, body } = await exchange(cfg, params, { consumeOnce, loadUser, revokeFamily, familyRevoked })
  return oauthJson(body, status, status === 401 ? { 'www-authenticate': 'Basic realm="DALIL"' } : {})
}
export const OPTIONS = preflight
