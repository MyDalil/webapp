import { createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * OAuth 2.1 sans table : chaque jeton (client, code, accès, rafraîchissement, consentement) est signé HS256
 * avec une clé propre à son usage, dérivée par HKDF du secret et de OAUTH_KEY_VERSION.
 * Changer la version change toutes les clés : tous les clients et jetons deviennent invalides (révocation globale).
 * Module pur (ni Payload ni Next) : testé dans core.test.ts.
 */

export type Purpose = 'client' | 'code' | 'access' | 'refresh' | 'consent' | 'stamp'
export type OAuthConfig = { issuer: string; resource: string; version: string; key: (p: Purpose) => Buffer }

export const CODE_TTL = 5 * 60
export const ACCESS_TTL = 60 * 60
export const REFRESH_TTL = 30 * 24 * 60 * 60
export const CONSENT_TTL = 10 * 60
export const SCOPE = 'mcp'
const MAX_TOKEN = 4096

export function makeConfig(secret: string, version: string, issuer: string): OAuthConfig | null {
  if (!secret || secret.length < 16) return null
  const cache = new Map<Purpose, Buffer>()
  const key = (p: Purpose) => {
    let k = cache.get(p)
    if (!k) {
      k = Buffer.from(hkdfSync('sha256', secret, 'dalil-oauth', `${p}:v${version}`, 32))
      cache.set(p, k)
    }
    return k
  }
  return { issuer, resource: `${issuer}/api/mcp/admin`, version, key }
}

const b64 = (v: string | Buffer) => Buffer.from(v).toString('base64url')
const HEADER = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
const now = () => Math.floor(Date.now() / 1000)
export const randomId = () => randomBytes(16).toString('base64url')

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

type Claims = Record<string, unknown> & { exp?: number; iat: number }

export function sign(cfg: OAuthConfig, p: Purpose, claims: Record<string, unknown>, ttl: number | null, at = now()): string {
  const body: Claims = { ...claims, typ: p, kv: cfg.version, iat: at }
  if (ttl !== null) body.exp = at + ttl
  const data = `${HEADER}.${b64(JSON.stringify(body))}`
  return `${data}.${createHmac('sha256', cfg.key(p)).update(data).digest('base64url')}`
}

/** Vérifie signature, usage, version et expiration ; renvoie les données ou null. */
export function verify(cfg: OAuthConfig, p: Purpose, token: unknown, at = now()): Claims | null {
  if (typeof token !== 'string' || token.length > MAX_TOKEN) return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== HEADER) return null
  const expected = createHmac('sha256', cfg.key(p)).update(`${parts[0]}.${parts[1]}`).digest('base64url')
  if (!safeEqual(expected, parts[2])) return null
  let c: Claims
  try {
    c = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!c || typeof c !== 'object' || c.typ !== p || c.kv !== cfg.version || typeof c.iat !== 'number') return null
  if (c.iat > at + 60) return null
  if (c.exp !== undefined && (typeof c.exp !== 'number' || c.exp <= at)) return null
  return c
}

// ——— redirect_uri ———

const HOSTS = ['claude.ai', 'claude.com', 'chatgpt.com', 'chat.openai.com']

/** Forme normalisée d’une adresse de retour autorisée, ou null (https sur les hôtes connus, http sur localhost / 127.0.0.1). */
export function normalizeRedirectUri(uri: unknown): string | null {
  if (typeof uri !== 'string' || uri.length > 512 || uri.includes('#')) return null
  let u: URL
  try {
    u = new URL(uri)
  } catch {
    return null
  }
  if (u.username || u.password) return null
  if (u.protocol === 'https:' && HOSTS.includes(u.hostname) && u.port === '') return u.href
  if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return u.href
  return null
}

// ——— PKCE (S256 seulement) ———

export const isVerifier = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9\-._~]{43,128}$/.test(v)
export const isChallenge = (c: unknown): c is string => typeof c === 'string' && /^[A-Za-z0-9_-]{43}$/.test(c)
export const s256 = (v: string) => createHash('sha256').update(v).digest('base64url')
export const pkceOk = (verifier: unknown, challenge: string) => isVerifier(verifier) && safeEqual(s256(verifier), challenge)

// ——— Clients (RFC 7591, sans base : le client_id est un jeton signé) ———

export type Client = { redirectUris: string[]; name: string }

export function cleanName(v: unknown) {
  const s = typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 80) : ''
  return s || 'Application sans nom'
}

export function registerClient(cfg: OAuthConfig, body: Record<string, unknown>, at = now()) {
  const raw = body.redirect_uris
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 5)
    return { error: 'invalid_redirect_uri', error_description: 'redirect_uris : 1 à 5 adresses.' } as const
  const uris: string[] = []
  for (const r of raw) {
    const n = normalizeRedirectUri(r)
    if (!n) return { error: 'invalid_redirect_uri', error_description: `Adresse de retour refusée : ${String(r).slice(0, 200)}` } as const
    if (!uris.includes(n)) uris.push(n)
  }
  const grants = body.grant_types
  if (grants !== undefined && (!Array.isArray(grants) || grants.some((g) => g !== 'authorization_code' && g !== 'refresh_token')))
    return { error: 'invalid_client_metadata', error_description: 'grant_types : authorization_code et refresh_token seulement.' } as const
  const types = body.response_types
  if (types !== undefined && (!Array.isArray(types) || types.some((t) => t !== 'code')))
    return { error: 'invalid_client_metadata', error_description: 'response_types : code seulement.' } as const
  const name = cleanName(body.client_name)
  const client_id = sign(cfg, 'client', { ru: uris, nm: name }, null, at)
  return {
    client_id,
    client_id_issued_at: at,
    client_name: name,
    redirect_uris: uris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: SCOPE,
  } as const
}

export function parseClient(cfg: OAuthConfig, clientId: unknown, at?: number): Client | null {
  const c = verify(cfg, 'client', clientId, at)
  if (!c || !Array.isArray(c.ru) || typeof c.nm !== 'string') return null
  return { redirectUris: c.ru.filter((u): u is string => typeof u === 'string'), name: c.nm }
}

/** Référence courte d’un client, inscrite dans les codes et jetons. */
export const clientRef = (clientId: string) => createHash('sha256').update(clientId).digest('base64url').slice(0, 22)

// ——— Comptes ———

export type StaffRole = 'patron' | 'admin' | 'editor'
export type StaffPrincipal = { kind: 'staff'; userId: number; role: StaffRole; name: string }
export type UserRecord = { id: number | string; role?: unknown; name?: unknown; email?: unknown; hash?: unknown; lockUntil?: unknown }

/** Empreinte du mot de passe : changer de mot de passe invalide les jetons de ce compte. */
export const userStamp = (cfg: OAuthConfig, u: UserRecord) =>
  createHmac('sha256', cfg.key('stamp')).update(`${u.id}:${typeof u.hash === 'string' ? u.hash : ''}`).digest('base64url').slice(0, 22)

/**
 * Compte équipe autorisé à relier une IA : patron, admin, editor (= « staff » de access.ts).
 * Le conseiller n’est jamais staff (moindre privilège) ; un compte verrouillé est refusé.
 */
export function staffPrincipal(u: UserRecord | null, at = Date.now()): StaffPrincipal | null {
  if (!u) return null
  const id = Number(u.id)
  const role = (u.role ?? 'editor') as string
  if (!Number.isInteger(id) || id <= 0 || !['patron', 'admin', 'editor'].includes(role)) return null
  if (u.lockUntil && new Date(String(u.lockUntil)).getTime() > at) return null
  return { kind: 'staff', userId: id, role: role as StaffRole, name: String(u.name || u.email || 'Équipe') }
}

// ——— Demande d’autorisation ———

export type AuthorizeParams = Record<string, string | undefined>
export type AuthorizeCheck =
  | { ok: true; client: Client; clientId: string; redirectUri: string; challenge: string; state?: string; scope: string }
  | { ok: false; page: string }
  | { ok: false; redirect: string }

export function withParams(base: string, params: Record<string, string | undefined>) {
  const u = new URL(base)
  for (const [k, v] of Object.entries(params)) if (v !== undefined) u.searchParams.set(k, v)
  return u.href
}

/** Contrôle une demande d’autorisation : erreurs sur le client ou l’adresse de retour = page d’erreur (jamais de redirection). */
export function checkAuthorize(cfg: OAuthConfig, p: AuthorizeParams, at?: number): AuthorizeCheck {
  const client = parseClient(cfg, p.client_id, at)
  if (!client || !p.client_id) return { ok: false, page: 'Application inconnue ou inscription expirée. Reliez à nouveau le connecteur.' }
  const asked = p.redirect_uri ? normalizeRedirectUri(p.redirect_uri) : client.redirectUris.length === 1 ? client.redirectUris[0] : null
  if (!asked || !client.redirectUris.includes(asked)) return { ok: false, page: 'Adresse de retour non déclarée par cette application.' }
  const state = p.state && p.state.length <= 1024 ? p.state : undefined
  const back = (error: string, error_description: string) => ({ ok: false as const, redirect: withParams(asked, { error, error_description, state, iss: cfg.issuer }) })
  if (p.response_type !== 'code') return back('unsupported_response_type', 'response_type=code attendu.')
  if (p.code_challenge_method !== 'S256' || !isChallenge(p.code_challenge)) return back('invalid_request', 'PKCE S256 obligatoire.')
  if (p.resource && p.resource.replace(/\/$/, '') !== cfg.resource) return back('invalid_target', 'Ressource inconnue.')
  return { ok: true, client, clientId: p.client_id, redirectUri: asked, challenge: p.code_challenge, state, scope: SCOPE }
}

/** Empreinte des paramètres signés dans le formulaire de consentement. */
export const consentHash = (a: { clientId: string; redirectUri: string; challenge: string; state?: string }) =>
  createHash('sha256').update(JSON.stringify([a.clientId, a.redirectUri, a.challenge, a.state ?? ''])).digest('base64url')

export const issueConsent = (cfg: OAuthConfig, userId: number, h: string, at?: number) => sign(cfg, 'consent', { sub: String(userId), h }, CONSENT_TTL, at)

export function checkConsent(cfg: OAuthConfig, token: unknown, userId: number, h: string, at?: number) {
  const c = verify(cfg, 'consent', token, at)
  return !!c && c.sub === String(userId) && typeof c.h === 'string' && safeEqual(c.h, h)
}

export const issueCode = (cfg: OAuthConfig, a: { clientId: string; redirectUri: string; challenge: string; userId: number; stamp: string }, at?: number) =>
  sign(cfg, 'code', { sub: String(a.userId), cid: clientRef(a.clientId), ru: a.redirectUri, cc: a.challenge, st: a.stamp, scope: SCOPE, jti: randomId() }, CODE_TTL, at)

/** Jeton d’accès : utilisable uniquement par le serveur MCP admin (aud). */
export function verifyAccess(cfg: OAuthConfig, token: unknown, at?: number) {
  const c = verify(cfg, 'access', token, at)
  if (!c || c.aud !== cfg.resource || c.iss !== cfg.issuer || typeof c.sub !== 'string' || typeof c.st !== 'string') return null
  return { userId: Number(c.sub), stamp: c.st, fam: typeof c.fam === 'string' ? c.fam : null }
}

// ——— Point de jeton ———

export type TokenDeps = {
  /** true la première fois seulement (code ou jeton de rafraîchissement à usage unique). */
  consumeOnce: (kind: 'code' | 'refresh', jti: string, ttlSec: number) => Promise<boolean>
  loadUser: (id: number) => Promise<UserRecord | null>
  /** Marque une famille de jetons comme compromise (réutilisation détectée) pour ttlSec secondes. */
  revokeFamily: (fam: string, ttlSec: number) => Promise<void>
  /** Lecture sans effet de bord : famille compromise ? */
  familyRevoked: (fam: string) => Promise<boolean>
}
export type TokenResult = { status: number; body: Record<string, unknown> }

const err = (status: number, error: string, error_description: string): TokenResult => ({ status, body: { error, error_description } })

function issuePair(cfg: OAuthConfig, sub: string, cid: string, st: string, fam: string, at?: number): TokenResult {
  const access_token = sign(cfg, 'access', { sub, cid, st, scope: SCOPE, aud: cfg.resource, iss: cfg.issuer, fam, jti: randomId() }, ACCESS_TTL, at)
  const refresh_token = sign(cfg, 'refresh', { sub, cid, st, scope: SCOPE, fam, jti: randomId() }, REFRESH_TTL, at)
  return { status: 200, body: { access_token, token_type: 'Bearer', expires_in: ACCESS_TTL, refresh_token, scope: SCOPE } }
}

/** POST /api/oauth/token : authorization_code (PKCE) et refresh_token (rotation, usage unique). */
export async function exchange(cfg: OAuthConfig, p: AuthorizeParams, deps: TokenDeps, at = now()): Promise<TokenResult> {
  const clientId = p.client_id
  if (!clientId) return err(401, 'invalid_client', 'client_id manquant.')
  if (!parseClient(cfg, clientId, at)) return err(401, 'invalid_client', 'Client inconnu.')
  const cid = clientRef(clientId)
  const userOk = async (sub: unknown, st: unknown) => {
    const id = Number(sub)
    if (!Number.isInteger(id) || id <= 0) return false
    const u = await deps.loadUser(id)
    return !!staffPrincipal(u, at * 1000) && typeof st === 'string' && safeEqual(userStamp(cfg, u as UserRecord), st)
  }
  if (p.grant_type === 'authorization_code') {
    if (!p.code || !p.code_verifier || !p.redirect_uri) return err(400, 'invalid_request', 'code, code_verifier et redirect_uri sont requis.')
    const c = verify(cfg, 'code', p.code, at)
    if (!c || c.cid !== cid) return err(400, 'invalid_grant', 'Code invalide ou expiré.')
    if (normalizeRedirectUri(p.redirect_uri) !== c.ru) return err(400, 'invalid_grant', 'redirect_uri différente.')
    if (!pkceOk(p.code_verifier, String(c.cc))) return err(400, 'invalid_grant', 'code_verifier incorrect.')
    // La famille des jetons issus de ce code porte l’identifiant du code : un code rejoué révoque tout ce qu’il a produit.
    const fam = String(c.jti)
    if (!(await deps.consumeOnce('code', fam, CODE_TTL + 60))) {
      await deps.revokeFamily(fam, REFRESH_TTL + 60)
      return err(400, 'invalid_grant', 'Code déjà utilisé.')
    }
    if (!(await userOk(c.sub, c.st))) return err(400, 'invalid_grant', 'Compte non autorisé.')
    return issuePair(cfg, String(c.sub), cid, String(c.st), fam, at)
  }
  if (p.grant_type === 'refresh_token') {
    if (!p.refresh_token) return err(400, 'invalid_request', 'refresh_token requis.')
    const c = verify(cfg, 'refresh', p.refresh_token, at)
    if (!c || c.cid !== cid) return err(400, 'invalid_grant', 'Jeton de rafraîchissement invalide ou expiré.')
    const fam = String(c.fam)
    if (await deps.familyRevoked(fam)) return err(400, 'invalid_grant', 'Connexion révoquée : reliez à nouveau le connecteur.')
    if (!(await deps.consumeOnce('refresh', String(c.jti), REFRESH_TTL + 60))) {
      // Réutilisation (RFC 9700 §4.14) : jeton probablement volé, toute la famille est révoquée.
      await deps.revokeFamily(fam, REFRESH_TTL + 60)
      return err(400, 'invalid_grant', 'Jeton de rafraîchissement déjà utilisé : connexion révoquée.')
    }
    if (!(await userOk(c.sub, c.st))) return err(400, 'invalid_grant', 'Compte non autorisé.')
    return issuePair(cfg, String(c.sub), cid, String(c.st), fam, at)
  }
  return err(400, 'unsupported_grant_type', 'authorization_code ou refresh_token.')
}

// ——— Métadonnées ———

export const authorizationServerMetadata = (cfg: OAuthConfig) => ({
  issuer: cfg.issuer,
  authorization_endpoint: `${cfg.issuer}/oauth/autoriser`,
  token_endpoint: `${cfg.issuer}/api/oauth/token`,
  registration_endpoint: `${cfg.issuer}/api/oauth/register`,
  revocation_endpoint: `${cfg.issuer}/api/oauth/revoke`,
  response_types_supported: ['code'],
  response_modes_supported: ['query'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'],
  token_endpoint_auth_methods_supported: ['none'],
  revocation_endpoint_auth_methods_supported: ['none'],
  scopes_supported: [SCOPE],
  authorization_response_iss_parameter_supported: true,
  service_documentation: `${cfg.issuer}/admin`,
})

export const protectedResourceMetadata = (cfg: OAuthConfig) => ({
  resource: cfg.resource,
  authorization_servers: [cfg.issuer],
  bearer_methods_supported: ['header'],
  scopes_supported: [SCOPE],
  resource_name: 'DALIL — administration',
})
