import { payload } from '@/platform/http'
import { checkAuthorize, checkConsent, consentHash, issueCode, staffPrincipal, userStamp, withParams, type UserRecord } from '@/platform/oauth/core'
import { loadUser, oauthConfig, readParams } from '@/platform/oauth/server'
import { guard } from '@/platform/security/rateLimit'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const page = (status: number, text: string, href?: string) =>
  new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="robots" content="noindex">${href ? `<meta http-equiv="refresh" content="0;url=${esc(href)}">` : ''}<title>DALIL</title></head><body style="font-family:system-ui,sans-serif;margin:3rem auto;max-width:32rem;padding:0 1rem"><p>${esc(text)}</p>${href ? `<p><a href="${esc(href)}">Continuer</a></p>` : ''}</body></html>`,
    {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'referrer-policy': 'no-referrer',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
      },
    },
  )

/** Le formulaire vient-il de notre propre page ? (Origin, sinon Sec-Fetch-Site ; sans l’un ni l’autre : refus.) */
function sameOrigin(req: Request, issuer: string) {
  const origin = req.headers.get('origin')
  if (origin) return origin === new URL(req.url).origin || origin === new URL(issuer).origin
  return req.headers.get('sec-fetch-site') === 'same-origin'
}

/**
 * Réponse au consentement (POST du formulaire de /oauth/autoriser). Protégé contre CSRF : jeton signé lié au compte
 * et aux paramètres + contrôle de l’origine. Retour vers l’application par une page de transition (meta refresh) :
 * la règle CSP `form-action 'self'` du site bloquerait une redirection directe vers claude.ai ou chatgpt.com.
 */
export async function POST(req: Request) {
  const cfg = oauthConfig()
  if (!cfg) return page(503, 'OAuth n’est pas configuré sur ce serveur.')
  if (!sameOrigin(req, cfg.issuer)) return page(403, 'Requête refusée (origine).')
  const limited = await guard('oauth-authorize', 30, 600)
  if (limited) return limited
  const params = await readParams(req)
  if (!params) return page(400, 'Requête illisible.')
  const check = checkAuthorize(cfg, { ...params, response_type: 'code', code_challenge_method: 'S256' })
  if (!check.ok) return page(400, 'page' in check ? check.page : 'Demande invalide. Relancez la connexion depuis l’application.')

  const { user } = await (await payload()).auth({ headers: req.headers })
  const me = user && (user as { collection?: string }).collection === 'users' ? staffPrincipal(user as unknown as UserRecord) : null
  if (!me) return page(401, 'Session expirée ou compte non autorisé. Relancez la connexion depuis l’application.')
  if (!checkConsent(cfg, params.consent, me.userId, consentHash(check))) return page(403, 'Formulaire expiré ou falsifié. Relancez la connexion depuis l’application.')

  if (params.decision !== 'allow')
    return page(200, 'Accès refusé. Retour vers l’application…', withParams(check.redirectUri, { error: 'access_denied', state: check.state, iss: cfg.issuer }))
  const full = await loadUser(me.userId)
  if (!full) return page(401, 'Compte introuvable.')
  const code = issueCode(cfg, { clientId: check.clientId, redirectUri: check.redirectUri, challenge: check.challenge, userId: me.userId, stamp: userStamp(cfg, full) })
  return page(200, 'Accès autorisé. Retour vers l’application…', withParams(check.redirectUri, { code, state: check.state, iss: cfg.issuer }))
}
