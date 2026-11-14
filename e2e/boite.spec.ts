import { expect, test, type Page } from '@playwright/test'

/**
 * Boîte unique (lot 8) : lecture d’un email reçu, réponse préparée, fil des réponses, statut, note interne.
 * Crée des demandes de test : bases jetables seulement → @ecriture.
 */
const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }

async function login(page: Page) {
  await page.context().clearCookies()
  await page.request.post('/api/users/first-register', { data: ADMIN })
  expect((await page.request.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })).ok()).toBe(true)
}

test.describe.serial('Cockpit — Boîte unique @ecriture', () => {
  test('email reçu : lecture, réponse préparée, fil et statut', async ({ page }) => {
    await login(page)
    const subject = `Question e2e ${Date.now()}`
    const created = await page.request.post('/api/submissions', { data: { kind: 'email', status: 'new', subject, email: 'visiteur.e2e@example.com', externalId: `<${subject}@example.com>`, data: { from: 'Visiteur <visiteur.e2e@example.com>', text: 'Bonjour, où trouver un notaire à Oran ?' } } })
    expect(created.ok()).toBe(true)
    const id = ((await created.json()) as { doc: { id: number } }).doc.id

    await page.goto('/admin/cockpit/boite?k=email')
    await expect(page.getByRole('heading', { level: 1, name: 'Boîte unique' })).toBeVisible({ timeout: 30_000 })
    await page.getByRole('link', { name: new RegExp(subject) }).click()
    await expect(page.getByRole('heading', { level: 2, name: subject })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('où trouver un notaire à Oran')).toBeVisible()

    await page.getByLabel('Réponse préparée…').selectOption({ label: 'Merci, nous regardons' })
    await expect(page.getByLabel('Votre réponse')).toHaveValue(/Merci pour votre message/)
    await page.getByLabel('Statut après l’envoi').selectOption({ label: 'Puis : Traité' })
    await page.getByRole('button', { name: 'Envoyer la réponse' }).click()
    await expect(page.getByText(/Réponse (acceptée par Resend|enregistrée)/)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/Réponses envoyées · 1/)).toBeVisible({ timeout: 20_000 })

    const doc = (await (await page.request.get(`/api/submissions/${id}?depth=0`)).json()) as { status: string; thread: Array<{ text: string }> }
    expect(doc.status).toBe('done')
    expect(doc.thread[0].text).toMatch(/Merci pour votre message/)
  })

  test('note interne enregistrée ; contribution traitée dans sa fiche', async ({ page }) => {
    await login(page)
    const c = await page.request.post('/api/submissions', { data: { kind: 'contribution', status: 'new', subject: `Contribution e2e ${Date.now()}`, email: 'contrib.e2e@example.com', data: { nom: 'Café test' } } })
    const id = ((await c.json()) as { doc: { id: number } }).doc.id
    await page.goto(`/admin/cockpit/boite?id=${id}`)
    await expect(page.getByText('Cette demande se traite dans sa fiche')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Café test')).toBeVisible()
    await page.getByLabel('Note interne (jamais envoyée)').fill('Vérifier l’adresse sur place.')
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByRole('status').filter({ hasText: '✓' })).toBeVisible({ timeout: 20_000 })
  })

  test('mobile 375 px : la boîte ne déborde pas', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page)
    await page.goto('/admin/cockpit/boite')
    await expect(page.getByRole('heading', { level: 1, name: 'Boîte unique' })).toBeVisible({ timeout: 30_000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
  })

  test('sans compte : réponse refusée ; webhook non signé refusé', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    expect((await anon.post('/api/boite/repondre', { data: { id: 1, text: 'x' } })).status()).toBe(401)
    expect([401, 503]).toContain((await anon.post('/api/resend/evenements', { data: { type: 'email.received', data: { email_id: 'x' } } })).status())
    await anon.dispose()
  })
})
