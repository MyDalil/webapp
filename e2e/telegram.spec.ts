import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Lot 4 : webhook Telegram. Secret de test (TELEGRAM_WEBHOOK_SECRET) ; sans jeton de bot, les réponses ne partent pas,
 * mais chaque commande agit bien, avec les droits réels du compte. Écrit en base → @ecriture.
 */
const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const CHAT = 987654321

const hook = (request: APIRequestContext, text: string, chat = CHAT, secret = SECRET) =>
  request.post('/api/telegram', { headers: { 'x-telegram-bot-api-secret-token': secret ?? '' }, data: { update_id: Date.now(), message: { chat: { id: chat, type: 'private' }, from: { id: chat }, text } } })

test.describe.serial('Telegram @ecriture', () => {
  test.skip(!SECRET, 'TELEGRAM_WEBHOOK_SECRET requis')

  test.beforeAll(async ({ playwright, baseURL }) => {
    const r = await playwright.request.newContext({ baseURL })
    await r.post('/api/users/first-register', { data: ADMIN })
    await r.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })
    const me = (await (await r.get(`/api/users?where[email][equals]=${ADMIN.email}&limit=1`)).json()).docs[0]
    expect((await r.patch(`/api/users/${me.id}`, { data: { telegramId: String(CHAT) } })).ok()).toBe(true)
  })

  test('secret faux : refusé', async ({ request }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit')
    expect((await hook(request, '/etat', CHAT, 'mauvais-secret')).status()).toBe(401)
  })

  test('un message libre devient une tâche du CEO ; /pause et /directive agissent', async ({ request }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit')
    const marker = `Telegram ordre ${Date.now()}`
    expect((await hook(request, marker)).status()).toBe(200)
    await request.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })
    const task = (await (await request.get(`/api/agent-tasks?where[title][equals]=${encodeURIComponent(marker)}&limit=1&depth=0`)).json()).docs[0]
    expect(task, 'tâche créée par Telegram').toBeTruthy()
    expect(task.origin).toBe('equipe')
    expect(task.issuedByUser).toBeTruthy()

    await request.patch(`/api/agent-tasks/${task.id}`, { data: { status: 'running' } })
    await hook(request, `/directive ${task.id} garde le vendredi à part`)
    await hook(request, `/pause ${task.id}`)
    const after = await (await request.get(`/api/agent-tasks/${task.id}?depth=0`)).json()
    expect(after.status).toBe('paused')
    expect(after.directive).toBe('garde le vendredi à part')
    await request.patch(`/api/agent-tasks/${task.id}`, { data: { status: 'cancelled' } })
  })

  test('un inconnu ne peut rien faire', async ({ request }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit')
    const marker = `Intrus ${Date.now()}`
    expect((await hook(request, marker, 111111111)).status()).toBe(200)
    await request.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })
    expect((await (await request.get(`/api/agent-tasks?where[title][equals]=${encodeURIComponent(marker)}&limit=1`)).json()).totalDocs).toBe(0)
  })

  test('/finir puis /relancer pilotent l’arrêt général', async ({ request }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit')
    await request.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })
    await hook(request, '/finir')
    expect((await (await request.get('/api/globals/controls')).json()).killSwitch).toBe('drain')
    await hook(request, '/relancer')
    expect((await (await request.get('/api/globals/controls')).json()).killSwitch).toBe('off')
  })
})
