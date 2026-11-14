import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Lot 3 : moteur d’agents (méthode ICM). Modèle de test déterministe (DALIL_TEST_LLM=1, refusé en production).
 * Écrit en base → @ecriture.
 */
const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }

async function login(request: APIRequestContext) {
  await request.post('/api/users/first-register', { data: ADMIN })
  expect((await request.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })).ok()).toBe(true)
}
const agentBySlug = async (request: APIRequestContext, slug: string) => (await (await request.get(`/api/agents?where[slug][equals]=${slug}&limit=1&depth=0`)).json()).docs[0]

test.describe.serial('Moteur d’agents @ecriture', () => {
  test.skip(!process.env.DALIL_TEST_LLM, 'modèle de test requis (DALIL_TEST_LLM=1)')

  test('16 rôles : 6 actifs, 10 en réserve', async ({ request }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit')
    await login(request)
    const all = (await (await request.get('/api/agents?where[roleId][exists]=true&limit=50&depth=0')).json()).docs as Array<{ slug: string; status: string }>
    expect(all).toHaveLength(16)
    expect(all.filter((a) => a.status === 'active').map((a) => a.slug).sort()).toEqual(['ceo', 'mediatheque', 'moderateur', 'redacteur', 'support', 'traducteur'])
  })

  test('sans budget global, aucun agent ne travaille ; avec budget, la tâche va jusqu’à « À valider »', async ({ request }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit')
    await login(request)
    const redacteur = await agentBySlug(request, 'redacteur')
    expect((await request.post('/api/globals/controls', { data: { agentsMonthlyBudgetUsd: null, killSwitch: 'off', agentsEnabled: true } })).ok()).toBe(true)
    const t1 = (await (await request.post('/api/agent-tasks', { data: { title: `Sans budget ${Date.now()}`, instructions: 'Test.', agent: redacteur.id } })).json()).doc
    await request.post('/api/agents/run')
    expect((await (await request.get(`/api/agent-tasks/${t1.id}?depth=0`)).json()).status).toBe('new')

    expect((await request.post('/api/globals/controls', { data: { agentsMonthlyBudgetUsd: 5 } })).ok()).toBe(true)
    const t2 = (await (await request.post('/api/agent-tasks', { data: { title: `Jardin d’Essai ${Date.now()}`, instructions: 'Lis la fiche [outil:read-content] puis conclus.', agent: redacteur.id } })).json()).doc
    await expect.poll(async () => {
      await request.post('/api/agents/run')
      return (await (await request.get(`/api/agent-tasks/${t2.id}?depth=0`)).json()).status
    }, { timeout: 30_000 }).toBe('review')
    const task = (await (await request.get(`/api/agent-tasks/${t2.id}?depth=0`)).json()) as { trace: Array<{ kind: string; tool?: string }>; steps: number; spentMicros: number; result: string; proposal: { items: unknown[] } }
    expect(task.trace.some((t) => t.kind === 'outil' && t.tool === 'read-content')).toBe(true)
    expect(task.steps).toBeGreaterThanOrEqual(3)
    expect(task.spentMicros).toBeGreaterThan(0)
    expect(task.result).toContain('prêt à valider')
    expect(task.proposal.items.length).toBeGreaterThan(0)
    await request.patch(`/api/agent-tasks/${t1.id}`, { data: { status: 'cancelled' } })

    // Fil d’activité : avant, pendant, après ; audit : action de l’agent signée.
    const phases = ((await (await request.get(`/api/agent-notifications?where[task][equals]=${t2.id}&limit=50`)).json()).docs as Array<{ phase: string }>).map((n) => n.phase)
    for (const p of ['before', 'during', 'after']) expect(phases).toContain(p)
    const audit = (await (await request.get(`/api/audit-log?where[taskId][equals]=${t2.id}&where[agentSlug][equals]=redacteur&limit=10`)).json()).docs as Array<{ actionId: string; department: string }>
    expect(audit.length).toBeGreaterThan(0)
    expect(audit[0].department).toBe('01-editorial')
  })

  test('arrêt général : la file ne fait aucune étape', async ({ request }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit')
    await login(request)
    const support = await agentBySlug(request, 'support')
    await request.post('/api/globals/controls', { data: { agentsMonthlyBudgetUsd: 5, killSwitch: 'stop' } })
    const t = (await (await request.post('/api/agent-tasks', { data: { title: `Arrêt ${Date.now()}`, instructions: 'Test.', agent: support.id } })).json()).doc
    await request.post('/api/agents/run')
    const after = await (await request.get(`/api/agent-tasks/${t.id}?depth=0`)).json()
    expect(after.steps ?? 0).toBe(0)
    await request.post('/api/globals/controls', { data: { killSwitch: 'off' } })
    await request.patch(`/api/agent-tasks/${t.id}`, { data: { status: 'cancelled' } })
  })

  test('activation d’un rôle en réserve : test à froid, puis retour en réserve', async ({ request }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit')
    await login(request)
    const r = await request.post('/api/agents/role', { data: { slug: 'analyste' } })
    expect(r.status(), await r.text()).toBe(200)
    const a = await agentBySlug(request, 'analyste')
    expect(a.status).toBe('active')
    expect(a.coldTestResult).toBe('pass')
    expect((await request.post('/api/agents/role', { data: { slug: 'analyste', action: 'reserve' } })).ok()).toBe(true)
    expect((await agentBySlug(request, 'analyste')).status).toBe('reserve')
  })

  test('tâche sans agent : le CEO la prend et la mène jusqu’à « À valider »', async ({ request }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit')
    await login(request)
    const ceo = await agentBySlug(request, 'ceo')
    await request.post('/api/globals/controls', { data: { agentsMonthlyBudgetUsd: 5, killSwitch: 'off', agentsEnabled: true } })
    const t = (await (await request.post('/api/agent-tasks', { data: { title: `Sans agent ${Date.now()}`, instructions: 'Lis la boîte [outil:read-inbox] puis conclus.' } })).json()).doc
    await expect.poll(async () => {
      await request.post('/api/agents/run')
      return (await (await request.get(`/api/agent-tasks/${t.id}?depth=0`)).json()).status
    }, { timeout: 30_000 }).toMatch(/review|failed/)
    const done = (await (await request.get(`/api/agent-tasks/${t.id}?depth=0`)).json()) as { agent: number; status: string; error?: string }
    expect(done.agent).toBe(ceo.id)
    expect(done.status, done.error).toBe('review')
    await request.patch(`/api/agent-tasks/${t.id}`, { data: { status: 'cancelled' } })
  })

  test('test à froid refusé pendant un arrêt général', async ({ request }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit')
    await login(request)
    await request.post('/api/globals/controls', { data: { killSwitch: 'cut' } })
    try {
      const r = await request.post('/api/agents/role', { data: { slug: 'juridique' } })
      expect(r.status()).toBe(422)
      expect(await r.text()).toContain('test à froid impossible')
      expect((await agentBySlug(request, 'juridique')).status).toBe('reserve')
    } finally {
      await request.post('/api/globals/controls', { data: { killSwitch: 'off' } })
    }
  })

  test('accès refusé sans compte', async ({ playwright, baseURL }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit')
    const anon = await playwright.request.newContext({ baseURL })
    expect((await anon.post('/api/agents/run')).status()).toBe(401)
    expect((await anon.get('/api/agents/run')).status()).toBe(401)
    expect((await anon.post('/api/agents/role', { data: { slug: 'analyste' } })).status()).toBe(401)
  })
})
