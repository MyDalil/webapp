import { createHash, randomBytes } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { ADMIN, apiOnly, ensureAdmin, rpc } from './comptes'
import { signIn } from './session'

/**
 * OAuth 2.1 du serveur MCP admin (docs/mcp-oauth.md, src/platform/oauth/*, src/app/api/oauth/*).
 * Lecture seule sauf le parcours complet (@ecriture : compte administrateur de test).
 */
const REDIRECT = 'http://localhost:9876/callback'
const pkce = () => {
  const verifier = randomBytes(32).toString('base64url')
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') }
}

test.describe('OAuth : métadonnées et inscription', () => {
  test.beforeEach(() => test.skip(apiOnly(test.info().project.name), 'une seule passe suffit'))

  test('métadonnées .well-known (RFC 8414 et RFC 9728)', async ({ request }) => {
    const as = await request.get('/.well-known/oauth-authorization-server')
    expect(as.status()).toBe(200)
    const m = await as.json()
    expect(m.authorization_endpoint).toBe(`${m.issuer}/oauth/autoriser`)
    expect(m.token_endpoint).toBe(`${m.issuer}/api/oauth/token`)
    expect(m.registration_endpoint).toBe(`${m.issuer}/api/oauth/register`)
    expect(m.code_challenge_methods_supported).toEqual(['S256'])
    expect(m.token_endpoint_auth_methods_supported).toEqual(['none'])

    for (const path of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/api/mcp/admin']) {
      const pr = await request.get(path)
      expect(pr.status(), path).toBe(200)
      const r = await pr.json()
      expect(r.resource).toBe(`${m.issuer}/api/mcp/admin`)
      expect(r.authorization_servers).toEqual([m.issuer])
    }
  })

  test('inscription : adresse de retour hors liste refusée, localhost accepté', async ({ request }) => {
    const bad = await request.post('/api/oauth/register', { data: { client_name: 'Intrus', redirect_uris: ['https://evil.example.com/callback'] } })
    expect(bad.status()).toBe(400)
    expect((await bad.json()).error).toBe('invalid_redirect_uri')
    const lookalike = await request.post('/api/oauth/register', { data: { client_name: 'Intrus', redirect_uris: ['https://claude.ai.evil.example.com/cb'] } })
    expect(lookalike.status()).toBe(400)
    const ok = await request.post('/api/oauth/register', { data: { client_name: 'Test e2e', redirect_uris: [REDIRECT] } })
    expect(ok.status()).toBe(201)
    const c = await ok.json()
    expect(c.client_id).toBeTruthy()
    expect(c.redirect_uris).toEqual([REDIRECT])
    expect(c.token_endpoint_auth_method).toBe('none')
  })

  test('consentement sans session : renvoi vers /admin/login', async ({ page, request }) => {
    const c = await (await request.post('/api/oauth/register', { data: { client_name: 'Test e2e', redirect_uris: [REDIRECT] } })).json()
    const { challenge } = pkce()
    const q = new URLSearchParams({ response_type: 'code', client_id: c.client_id, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: 'S256', state: 'etat-e2e' })
    await page.context().clearCookies()
    await page.goto(`/oauth/autoriser?${q}`)
    await expect(page).toHaveURL(/\/admin\/login/)
    expect(decodeURIComponent(page.url())).toContain('/oauth/autoriser?')
  })

  test('consentement : client inconnu → page de refus, sans redirection', async ({ page }) => {
    await page.goto(`/oauth/autoriser?response_type=code&client_id=faux&redirect_uri=${encodeURIComponent(REDIRECT)}`)
    await expect(page.getByRole('heading', { name: 'Demande refusée' })).toBeVisible()
  })
})

test.describe.serial('OAuth : parcours complet @ecriture', () => {
  test.beforeEach(() => test.skip(apiOnly(test.info().project.name), 'une seule passe suffit'))

  test('consentement → code → jeton PKCE → appel MCP admin → code réutilisé refusé', async ({ page, request }) => {
    test.setTimeout(60_000)
    await ensureAdmin(page.request)
    const client = await (await request.post('/api/oauth/register', { data: { client_name: 'Test e2e', redirect_uris: [REDIRECT] } })).json()
    const { verifier, challenge } = pkce()
    const state = `etat-${Date.now()}`
    const q = new URLSearchParams({ response_type: 'code', client_id: client.client_id, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: 'S256', state })

    // Le navigateur suit la page de transition vers l’adresse de retour : on l’intercepte.
    let back: URL | null = null
    await page.route('http://localhost:9876/**', (route) => {
      back = new URL(route.request().url())
      return route.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' })
    })
    await signIn(page.request, ADMIN)
    await page.goto(`/oauth/autoriser?${q}`)
    await expect(page.getByRole('heading', { name: 'Autoriser l’accès à DALIL' })).toBeVisible()
    await expect(page.getByText(`Retour vers : localhost:9876`)).toBeVisible()
    await page.getByRole('button', { name: 'Autoriser' }).click()
    await expect.poll(() => back?.searchParams.get('code') ?? null, { timeout: 15_000 }).not.toBeNull()
    const url = back as unknown as URL
    expect(url.searchParams.get('state')).toBe(state)
    expect(url.searchParams.get('iss')).toBeTruthy()
    const code = url.searchParams.get('code')!

    // Mauvais vérificateur PKCE : refusé (et le code n’est pas consommé avant la vérification PKCE).
    const wrong = await request.post('/api/oauth/token', { form: { grant_type: 'authorization_code', code, code_verifier: pkce().verifier, redirect_uri: REDIRECT, client_id: client.client_id } })
    expect(wrong.status()).toBe(400)
    expect((await wrong.json()).error).toBe('invalid_grant')

    const tok = await request.post('/api/oauth/token', { form: { grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: REDIRECT, client_id: client.client_id } })
    expect(tok.status()).toBe(200)
    const t = await tok.json()
    expect(t.token_type).toBe('Bearer')
    expect(t.access_token).toBeTruthy()
    expect(t.refresh_token).toBeTruthy()

    const list = await rpc(request, '/api/mcp/admin', { jsonrpc: '2.0', id: 1, method: 'tools/list' }, t.access_token)
    expect(list.status()).toBe(200)
    const names = ((await list.json()).result.tools as { name: string }[]).map((x) => x.name)
    expect(names).toContain('creer_brouillon_lieu')
    expect(names).not.toContain('publier_fiche')

    // Jeton de rafraîchissement : rotation, usage unique (avant le rejeu du code, qui révoque toute la famille).
    const r1 = await request.post('/api/oauth/token', { form: { grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: client.client_id } })
    expect(r1.status()).toBe(200)
    const t2 = await r1.json()
    expect(t2.refresh_token).toBeTruthy()
    expect(t2.refresh_token).not.toBe(t.refresh_token)
    expect((await rpc(request, '/api/mcp/admin', { jsonrpc: '2.0', id: 2, method: 'tools/list' }, t2.access_token)).status()).toBe(200)
    // Ancien jeton rejoué : refusé, et toute la famille est révoquée (docs/mcp-oauth.md, RFC 9700) — le nouveau jeton aussi.
    const r2 = await request.post('/api/oauth/token', { form: { grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: client.client_id } })
    expect(r2.status()).toBe(400)
    expect((await r2.json()).error).toBe('invalid_grant')
    const revoked = await request.post('/api/oauth/token', { form: { grant_type: 'refresh_token', refresh_token: t2.refresh_token, client_id: client.client_id } })
    expect(revoked.status()).toBe(400)
    expect((await rpc(request, '/api/mcp/admin', { jsonrpc: '2.0', id: 3, method: 'tools/list' }, t2.access_token)).status()).toBe(401)

    // Code rejoué : refusé (usage unique ; la révocation de la famille par rejeu du code est couverte par core.test.ts).
    const again = await request.post('/api/oauth/token', { form: { grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: REDIRECT, client_id: client.client_id } })
    expect(again.status()).toBe(400)
    expect((await again.json()).error).toBe('invalid_grant')
  })

  test('décision POST sans origine du site : refusée (CSRF)', async ({ request }) => {
    const res = await request.post('/api/oauth/autoriser', { headers: { origin: 'https://evil.example.com' }, form: { decision: 'allow' } })
    expect(res.status()).toBe(403)
  })
})
