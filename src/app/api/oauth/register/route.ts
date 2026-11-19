import { registerClient } from '@/platform/oauth/core'
import { disabled, oauthConfig, oauthJson, preflight } from '@/platform/oauth/server'
import { guard } from '@/platform/security/rateLimit'

/**
 * Inscription dynamique de client (RFC 7591), sans base : le client_id renvoyé est un jeton signé qui contient
 * les adresses de retour (https sur claude.ai, claude.com, chatgpt.com, chat.openai.com ; http sur localhost / 127.0.0.1).
 * Client public : pas de secret, PKCE S256 obligatoire.
 */
export async function POST(req: Request) {
  const cfg = oauthConfig()
  if (!cfg) return disabled()
  const limited = await guard('oauth-register', 20, 3600)
  if (limited) return limited
  const text = await req.text()
  if (text.length > 8192) return oauthJson({ error: 'invalid_client_metadata', error_description: 'Requête trop grande.' }, 400)
  let body: Record<string, unknown>
  try {
    body = JSON.parse(text)
  } catch {
    return oauthJson({ error: 'invalid_client_metadata', error_description: 'JSON attendu.' }, 400)
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return oauthJson({ error: 'invalid_client_metadata', error_description: 'Objet JSON attendu.' }, 400)
  const out = registerClient(cfg, body)
  return 'error' in out ? oauthJson(out, 400) : oauthJson(out, 201)
}
export const OPTIONS = preflight
