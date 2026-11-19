import { describe, expect, it } from 'vitest'
import {
  ACCESS_TTL, CODE_TTL, checkAuthorize, checkConsent, clientRef, consentHash, exchange, issueCode, issueConsent, makeConfig,
  normalizeRedirectUri, parseClient, pkceOk, registerClient, s256, sign, staffPrincipal, userStamp, verify, verifyAccess,
  type TokenDeps, type UserRecord,
} from './core'

const SECRET = 'secret-de-test-assez-long-0123456789'
const ISSUER = 'https://www.mydalil.com'
const cfg = makeConfig(SECRET, '1', ISSUER)!
const T = 1_800_000_000
const CB = 'https://claude.ai/api/mcp/auth_callback'
const verifier = 'v'.repeat(20) + '-._~' + 'A1b2C3d4e5F6g7H8i9J0k'
const challenge = s256(verifier)

const user: UserRecord = { id: 7, role: 'admin', name: 'Rad', email: 'rad@example.org', hash: 'h1' }
const client = () => registerClient(cfg, { redirect_uris: [CB], client_name: 'Claude' }, T) as { client_id: string }

function deps(u: UserRecord | null = user) {
  const used = new Set<string>()
  const revoked = new Set<string>()
  const d: TokenDeps & { revoked: Set<string> } = {
    consumeOnce: async (k, jti) => (used.has(`${k}:${jti}`) ? false : (used.add(`${k}:${jti}`), true)),
    loadUser: async (id) => (u && Number(u.id) === id ? u : null),
    revokeFamily: async (fam) => void revoked.add(fam),
    familyRevoked: async (fam) => revoked.has(fam),
    revoked,
  }
  return d
}

describe('jetons signés', () => {
  it('accepte un jeton valide et refuse signature, usage, version et expiration incorrects', () => {
    const t = sign(cfg, 'access', { sub: '7' }, 60, T)
    expect(verify(cfg, 'access', t, T + 10)?.sub).toBe('7')
    expect(verify(cfg, 'access', t, T + 61)).toBeNull()
    expect(verify(cfg, 'refresh', t, T)).toBeNull()
    expect(verify(makeConfig(SECRET, '2', ISSUER)!, 'access', t, T)).toBeNull()
    expect(verify(makeConfig('autre-secret-tout-aussi-long-xx', '1', ISSUER)!, 'access', t, T)).toBeNull()
    const [h, , s] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ sub: '1', typ: 'access', kv: '1', iat: T, exp: T + 999 })).toString('base64url')
    expect(verify(cfg, 'access', `${h}.${forged}.${s}`, T)).toBeNull()
    const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    expect(verify(cfg, 'access', `${none}.${t.split('.')[1]}.`, T)).toBeNull()
  })
  it('refuse un secret absent ou trop court', () => {
    expect(makeConfig('', '1', ISSUER)).toBeNull()
    expect(makeConfig('court', '1', ISSUER)).toBeNull()
  })
  it('jeton d’accès : audience et émetteur', () => {
    const ok = sign(cfg, 'access', { sub: '7', st: 'x', aud: cfg.resource, iss: ISSUER }, ACCESS_TTL, T)
    expect(verifyAccess(cfg, ok, T)).toEqual({ userId: 7, stamp: 'x', fam: null })
    expect(verifyAccess(cfg, sign(cfg, 'access', { sub: '7', st: 'x', aud: 'https://autre.example/mcp', iss: ISSUER }, ACCESS_TTL, T), T)).toBeNull()
    expect(verifyAccess(cfg, sign(cfg, 'access', { sub: '7', st: 'x', aud: cfg.resource, iss: 'https://evil.example' }, ACCESS_TTL, T), T)).toBeNull()
    expect(cfg.resource).toBe('https://www.mydalil.com/api/mcp/admin')
  })
})

describe('redirect_uri', () => {
  it.each([CB, 'https://claude.com/api/mcp/auth_callback', 'https://chatgpt.com/connector_platform_oauth_redirect', 'https://chat.openai.com/aip/x/oauth/callback', 'http://localhost:6274/oauth/callback', 'http://127.0.0.1:33418/cb'])('autorise %s', (u) => {
    expect(normalizeRedirectUri(u)).toBe(new URL(u).href)
  })
  it.each(['http://claude.ai/cb', 'https://evil.claude.ai/cb', 'https://claude.ai.evil.com/cb', 'https://claude.ai:8443/cb', 'https://user@claude.ai/cb', 'https://claude.ai/cb#x', 'javascript:alert(1)', 'https://localhost/cb', 'http://localhost.evil.com/cb', 'http://10.0.0.1/cb', 'pas une url'])('refuse %s', (u) => {
    expect(normalizeRedirectUri(u)).toBeNull()
  })
  it('inscription : refuse une adresse non autorisée, accepte claude.ai', () => {
    expect(registerClient(cfg, { redirect_uris: ['https://evil.example/cb'] })).toHaveProperty('error', 'invalid_redirect_uri')
    expect(registerClient(cfg, { redirect_uris: [] })).toHaveProperty('error')
    const c = client()
    expect(parseClient(cfg, c.client_id, T)).toEqual({ redirectUris: [CB], name: 'Claude' })
  })
})

describe('client_id', () => {
  it('refuse un client_id falsifié ou d’une autre version', () => {
    const { client_id } = client()
    const [h, , s] = client_id.split('.')
    const evil = Buffer.from(JSON.stringify({ ru: ['https://evil.example/cb'], nm: 'Claude', typ: 'client', kv: '1', iat: T })).toString('base64url')
    expect(parseClient(cfg, `${h}.${evil}.${s}`, T)).toBeNull()
    expect(parseClient(makeConfig(SECRET, '2', ISSUER)!, client_id, T)).toBeNull()
    // Un jeton d’un autre usage (même secret) n’est pas un client.
    expect(parseClient(cfg, sign(cfg, 'access', { ru: [CB], nm: 'x' }, null, T), T)).toBeNull()
  })
})

describe('demande d’autorisation', () => {
  const base = () => ({ client_id: client().client_id, redirect_uri: CB, response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256', state: 'abc' })
  it('accepte une demande correcte', () => {
    const r = checkAuthorize(cfg, base(), T)
    expect(r.ok).toBe(true)
  })
  it('client inconnu ou adresse non déclarée : page d’erreur, jamais de redirection', () => {
    expect(checkAuthorize(cfg, { ...base(), client_id: 'x.y.z' }, T)).toHaveProperty('page')
    expect(checkAuthorize(cfg, { ...base(), redirect_uri: 'https://chatgpt.com/autre' }, T)).toHaveProperty('page')
  })
  it('PKCE S256 obligatoire, ressource contrôlée', () => {
    expect(checkAuthorize(cfg, { ...base(), code_challenge_method: 'plain' }, T)).toHaveProperty('redirect')
    expect(checkAuthorize(cfg, { ...base(), code_challenge: undefined }, T)).toHaveProperty('redirect')
    expect(checkAuthorize(cfg, { ...base(), resource: 'https://autre.example/mcp' }, T)).toHaveProperty('redirect')
    expect(checkAuthorize(cfg, { ...base(), resource: cfg.resource }, T).ok).toBe(true)
  })
  it('jeton de consentement lié au compte et aux paramètres', () => {
    const r = checkAuthorize(cfg, base(), T)
    if (!r.ok) throw new Error()
    const h = consentHash(r)
    const t = issueConsent(cfg, 7, h, T)
    expect(checkConsent(cfg, t, 7, h, T + 5)).toBe(true)
    expect(checkConsent(cfg, t, 8, h, T + 5)).toBe(false)
    expect(checkConsent(cfg, t, 7, consentHash({ ...r, redirectUri: 'http://localhost:1/cb' }), T + 5)).toBe(false)
    expect(checkConsent(cfg, t, 7, h, T + 601)).toBe(false)
  })
})

describe('point de jeton', () => {
  const setup = () => {
    const { client_id } = client()
    const code = issueCode(cfg, { clientId: client_id, redirectUri: CB, challenge, userId: 7, stamp: userStamp(cfg, user) }, T)
    return { client_id, code, req: { grant_type: 'authorization_code', client_id, code, redirect_uri: CB, code_verifier: verifier } }
  }

  it('échange un code puis fait tourner le jeton de rafraîchissement', async () => {
    const { req, client_id } = setup()
    const d = deps()
    const r = await exchange(cfg, req, d, T + 10)
    expect(r.status).toBe(200)
    const access = String(r.body.access_token)
    expect(verifyAccess(cfg, access, T + 20)?.userId).toBe(7)
    expect(verifyAccess(cfg, access, T + 10 + ACCESS_TTL + 1)).toBeNull()
    const r2 = await exchange(cfg, { grant_type: 'refresh_token', client_id, refresh_token: String(r.body.refresh_token) }, d, T + 100)
    expect(r2.status).toBe(200)
    expect(r2.body.refresh_token).not.toBe(r.body.refresh_token)
    // L’ancien jeton de rafraîchissement ne sert plus.
    expect((await exchange(cfg, { grant_type: 'refresh_token', client_id, refresh_token: String(r.body.refresh_token) }, d, T + 101)).body.error).toBe('invalid_grant')
  })

  it('code rejoué : refusé et toute la famille issue du code est révoquée', async () => {
    const { req, client_id } = setup()
    const d = deps()
    const r = await exchange(cfg, req, d, T + 10)
    expect((await exchange(cfg, req, d, T + 11)).body.error).toBe('invalid_grant')
    expect(d.revoked.size).toBe(1)
    const fam = verifyAccess(cfg, String(r.body.access_token), T + 12)?.fam
    expect(fam && d.revoked.has(fam)).toBe(true)
    expect((await exchange(cfg, { grant_type: 'refresh_token', client_id, refresh_token: String(r.body.refresh_token) }, d, T + 20)).body.error).toBe('invalid_grant')
  })

  it('jeton de rafraîchissement réutilisé : famille compromise, le jeton légitime suivant est refusé aussi', async () => {
    const { req, client_id } = setup()
    const d = deps()
    const r = await exchange(cfg, req, d, T + 10)
    const old = String(r.body.refresh_token)
    const r2 = await exchange(cfg, { grant_type: 'refresh_token', client_id, refresh_token: old }, d, T + 100)
    expect(r2.status).toBe(200)
    expect(d.revoked.size).toBe(0)
    // L’attaquant rejoue l’ancien jeton : refus et révocation de la famille.
    const replay = await exchange(cfg, { grant_type: 'refresh_token', client_id, refresh_token: old }, d, T + 101)
    expect(replay.body.error).toBe('invalid_grant')
    expect(d.revoked.size).toBe(1)
    // Le nouveau jeton (pourtant jamais utilisé) ne sert plus : la famille est compromise.
    const next = await exchange(cfg, { grant_type: 'refresh_token', client_id, refresh_token: String(r2.body.refresh_token) }, d, T + 102)
    expect(next.body.error_description).toContain('révoquée')
    // Les jetons d’accès portent la famille (vérifiée par verify.ts).
    expect(verifyAccess(cfg, String(r2.body.access_token), T + 103)?.fam).toBe(verifyAccess(cfg, String(r.body.access_token), T + 11)?.fam)
  })

  it('PKCE : mauvais code_verifier refusé', async () => {
    const { req } = setup()
    expect(pkceOk(verifier, challenge)).toBe(true)
    const r = await exchange(cfg, { ...req, code_verifier: 'w'.repeat(43) }, deps(), T + 10)
    expect(r.body.error).toBe('invalid_grant')
  })

  it('redirect_uri, client_id et expiration du code', async () => {
    const { req } = setup()
    expect((await exchange(cfg, { ...req, redirect_uri: 'https://chatgpt.com/x' }, deps(), T + 10)).body.error).toBe('invalid_grant')
    const other = registerClient(cfg, { redirect_uris: [CB] }, T + 1) as { client_id: string }
    expect(other.client_id).not.toBe(req.client_id)
    expect((await exchange(cfg, { ...req, client_id: other.client_id }, deps(), T + 10)).body.error).toBe('invalid_grant')
    expect((await exchange(cfg, { ...req, client_id: 'falsifie' }, deps(), T + 10)).status).toBe(401)
    expect((await exchange(cfg, req, deps(), T + CODE_TTL + 1)).body.error).toBe('invalid_grant')
    expect((await exchange(cfg, { ...req, grant_type: 'password' }, deps(), T + 10)).body.error).toBe('unsupported_grant_type')
  })

  it('compte : conseiller, verrouillé ou mot de passe changé refusés', async () => {
    const { req } = setup()
    expect((await exchange(cfg, req, deps({ ...user, role: 'conseiller' }), T + 10)).body.error).toBe('invalid_grant')
    expect((await exchange(cfg, req, deps({ ...user, hash: 'nouveau' }), T + 10)).body.error).toBe('invalid_grant')
    expect((await exchange(cfg, req, deps(null), T + 10)).body.error).toBe('invalid_grant')
    expect(staffPrincipal({ ...user, lockUntil: new Date((T + 999) * 1000).toISOString() }, T * 1000)).toBeNull()
    expect(staffPrincipal(user)).toEqual({ kind: 'staff', userId: 7, role: 'admin', name: 'Rad' })
  })

  it('référence de client stable', () => {
    const { client_id } = client()
    expect(clientRef(client_id)).toBe(clientRef(client_id))
  })
})
