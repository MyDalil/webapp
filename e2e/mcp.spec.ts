import { expect, test } from '@playwright/test'
import { apiOnly, ensureAdmin, rpc } from './comptes'

/**
 * Serveurs MCP de DALIL (src/app/api/mcp/route.ts public, src/app/api/mcp/admin/route.ts équipe).
 * Lecture seule sauf le dernier bloc (@ecriture). La clé de test E2E_MCP_KEY est générée par la CI
 * (comme scripts/mcp-key.mjs) et son empreinte déclarée dans DALIL_MCP_KEYS pour le compte administrateur.
 */
const KEY = process.env.E2E_MCP_KEY
const call = (id: number, name: string, args: Record<string, unknown>) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } })
type Tool = { name: string; annotations: { readOnlyHint: boolean } }

test.describe('MCP public', () => {
  test.beforeEach(() => test.skip(apiOnly(test.info().project.name), 'une seule passe suffit'))

  test('initialize : version négociée et identité du serveur', async ({ request }) => {
    const res = await rpc(request, '/api/mcp', { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '1' } } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.result.protocolVersion).toBe('2025-06-18')
    expect(body.result.serverInfo.name).toBe('dalil')
    expect(body.result.capabilities.tools).toBeTruthy()
  })

  test('tools/list : lecture seule, aucun outil d’écriture', async ({ request }) => {
    const body = await (await rpc(request, '/api/mcp', { jsonrpc: '2.0', id: 2, method: 'tools/list' })).json()
    const tools = body.result.tools as Tool[]
    const names = tools.map((t) => t.name)
    expect(names).toContain('rechercher')
    expect(names).toContain('voir_fiche')
    for (const w of ['creer_brouillon_lieu', 'publier_fiche', 'rejeter_fiche', 'modifier_brouillon', 'importer_csv', 'envoyer_newsletter']) expect(names, w).not.toContain(w)
    for (const t of tools) expect(t.annotations.readOnlyHint, t.name).toBe(true)
  })

  test('tools/call rechercher : résultat structuré, liens mydalil.com', async ({ request }) => {
    const body = await (await rpc(request, '/api/mcp', call(3, 'rechercher', { texte: 'pharmacie', limite: 3 }))).json()
    expect(body.result.isError).toBe(false)
    expect(body.result.structuredContent).toBeTruthy()
    expect(body.result.content[0].type).toBe('text')
    const text = body.result.content[0].text as string
    if (/https?:\/\//.test(text)) expect(text).toContain('mydalil.com')
  })

  test('un outil d’écriture appelé sur le serveur public est inconnu', async ({ request }) => {
    const body = await (await rpc(request, '/api/mcp', call(4, 'creer_brouillon_lieu', { nom: 'x', secteur: 'sante-soins', categorie: 'Pharmacies', ville: 'Alger' }))).json()
    expect(body.error.code).toBe(-32602)
  })

  test('lot de plus de 10 messages refusé ; lot de 2 accepté', async ({ request }) => {
    const big = Array.from({ length: 11 }, (_, i) => ({ jsonrpc: '2.0', id: 100 + i, method: 'ping' }))
    const res = await rpc(request, '/api/mcp', big)
    expect(res.status()).toBe(400)
    expect((await res.json()).error.code).toBe(-32600)
    const ok = await rpc(request, '/api/mcp', big.slice(0, 2))
    expect(ok.status()).toBe(200)
    expect(await ok.json()).toHaveLength(2)
  })

  test('méthode inconnue, notification, JSON illisible, GET', async ({ request }) => {
    expect((await (await rpc(request, '/api/mcp', { jsonrpc: '2.0', id: 5, method: 'resources/list' })).json()).error.code).toBe(-32601)
    expect((await rpc(request, '/api/mcp', { jsonrpc: '2.0', method: 'notifications/initialized' })).status()).toBe(202)
    // Buffer : Playwright envoie tel quel ; une chaîne non JSON serait réencodée en chaîne JSON valide (« "{pas du json" »).
    const bad = await request.post('/api/mcp', { headers: { 'content-type': 'application/json' }, data: Buffer.from('{pas du json', 'utf8') })
    expect(bad.status()).toBe(400)
    expect((await bad.json()).error.code).toBe(-32700)
    expect((await request.get('/api/mcp')).status()).toBe(405)
  })
})

test.describe('MCP admin', () => {
  test.beforeEach(() => test.skip(apiOnly(test.info().project.name), 'une seule passe suffit'))

  test('sans jeton : 401 et WWW-Authenticate avec resource_metadata', async ({ request }) => {
    const res = await rpc(request, '/api/mcp/admin', { jsonrpc: '2.0', id: 1, method: 'tools/list' })
    expect(res.status()).toBe(401)
    expect(res.headers()['www-authenticate']).toMatch(/^Bearer .*resource_metadata="https?:\/\/[^"]+\/\.well-known\/oauth-protected-resource/)
  })

  test('clé inconnue : 401', async ({ request }) => {
    const res = await rpc(request, '/api/mcp/admin', { jsonrpc: '2.0', id: 1, method: 'tools/list' }, 'dalil_cle-inconnue-pour-le-test-e2e-0000000000000')
    expect(res.status()).toBe(401)
  })

  test('avec la clé de test : brouillon proposé, publication jamais proposée', async ({ request }) => {
    test.skip(!KEY, 'E2E_MCP_KEY absente (clé de test de la CI)')
    await ensureAdmin(request) // le titulaire de la clé doit exister
    const body = await (await rpc(request, '/api/mcp/admin', { jsonrpc: '2.0', id: 2, method: 'tools/list' }, KEY)).json()
    const names = (body.result.tools as Tool[]).map((t) => t.name)
    expect(names).toContain('creer_brouillon_lieu')
    expect(names).toContain('rechercher')
    expect(names).not.toContain('publier_fiche')
    expect(names).not.toContain('rejeter_fiche')
    const publish = await (await rpc(request, '/api/mcp/admin', call(3, 'publier_fiche', { collection: 'places', id: 1 }), KEY)).json()
    expect(publish.error.code).toBe(-32602)
  })
})

test.describe('MCP admin @ecriture', () => {
  test.beforeEach(() => test.skip(apiOnly(test.info().project.name), 'une seule passe suffit'))

  test('creer_brouillon_lieu crée un brouillon « À vérifier » invisible du public', async ({ request, playwright, baseURL }) => {
    test.skip(!KEY, 'E2E_MCP_KEY absente (clé de test de la CI)')
    await ensureAdmin(request)
    const nom = `Pharmacie MCP ${Date.now()}`
    const body = await (await rpc(request, '/api/mcp/admin', call(4, 'creer_brouillon_lieu', { nom, secteur: 'sante-soins', categorie: 'Pharmacies', ville: 'Alger', wilaya: '16', source: 'test e2e', _status: 'published' }), KEY)).json()
    // `_status` n’est pas dans le schéma de l’outil : refusé à la validation ou retiré ; dans les deux cas, rien de publié.
    let id: number
    if (body.result?.isError) {
      const retry = await (await rpc(request, '/api/mcp/admin', call(5, 'creer_brouillon_lieu', { nom, secteur: 'sante-soins', categorie: 'Pharmacies', ville: 'Alger', wilaya: '16', source: 'test e2e' }), KEY)).json()
      expect(retry.result.isError).toBe(false)
      id = retry.result.structuredContent.id
    } else id = body.result.structuredContent.id
    expect(id).toBeGreaterThan(0)

    const doc = await (await request.get(`/api/places/${id}?draft=true&depth=0`)).json()
    expect(doc._status).toBe('draft')
    expect(doc.verification).toBe('spotted')

    const anon = await playwright.request.newContext({ baseURL })
    const pub = await anon.get(`/api/places/${id}?depth=0`)
    expect(pub.status(), 'brouillon caché au public').toBeGreaterThanOrEqual(400)
    const list = await (await anon.get(`/api/places?where[name][equals]=${encodeURIComponent(nom)}&limit=1`)).json()
    expect(list.totalDocs ?? 0).toBe(0)
    const seen = await (await rpc(anon, '/api/mcp', call(6, 'rechercher', { texte: nom }))).json()
    // `requete` répète le texte cherché : seuls les résultats doivent ignorer le brouillon.
    const resultats = seen.result.structuredContent.resultats as { titre: string }[]
    expect(Array.isArray(resultats)).toBe(true)
    expect(JSON.stringify(resultats)).not.toContain(nom)
    await anon.dispose()
  })
})
