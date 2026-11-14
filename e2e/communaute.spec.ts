import { expect, test, type Page } from '@playwright/test'

/**
 * Communauté (lot 9) : Modération, Annonces (score anti-arnaque), Professionnels, Membres.
 * Modifie puis rétablit une annonce d’exemple : bases jetables seulement → @ecriture.
 */
const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }

async function login(page: Page) {
  await page.context().clearCookies()
  await page.request.post('/api/users/first-register', { data: ADMIN })
  expect((await page.request.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })).ok()).toBe(true)
}

test.describe.serial('Cockpit — Communauté @ecriture', () => {
  for (const [path, title] of [['/admin/cockpit/moderation', 'Modération'], ['/admin/cockpit/annonces', 'Annonces'], ['/admin/cockpit/pros', 'Professionnels'], ['/admin/cockpit/membres', 'Membres']] as const) {
    test(`${title} : s’ouvre`, async ({ page }) => {
      await login(page)
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible({ timeout: 30_000 })
    })
  }

  test('annonce suspecte : score et raisons visibles, publication par un humain', async ({ page }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule annonce modifiée par passage')
    await login(page)
    const r = await page.request.get('/api/classifieds?limit=1&depth=0&where[example][equals]=true&where[status][equals]=published')
    const ad = ((await r.json()) as { docs: Array<{ id: number; title: string; description: string }> }).docs[0]
    test.skip(!ad, 'aucune annonce d’exemple dans cette base')
    try {
      const upd = await page.request.patch(`/api/classifieds/${ad.id}`, { data: { status: 'pending', description: `${ad.description}\nEnvoyez un acompte par Western Union avant la visite.` } })
      expect(upd.ok()).toBe(true)
      await page.goto('/admin/cockpit/annonces')
      const card = page.getByRole('article', { name: ad.title })
      await expect(card).toBeVisible({ timeout: 30_000 })
      await expect(card.getByText(/Score anti-arnaque \d+\/100/)).toBeVisible()
      await expect(card.getByText('Demande de paiement ou d’avance avant la remise')).toBeVisible()
      await card.getByRole('button', { name: 'Publier' }).click()
      await expect(card).toHaveCount(0, { timeout: 20_000 })
      expect(((await (await page.request.get(`/api/classifieds/${ad.id}?depth=0`)).json()) as { status: string }).status).toBe('published')
    } finally {
      await page.request.patch(`/api/classifieds/${ad.id}`, { data: { description: ad.description } })
      await page.request.patch(`/api/classifieds/${ad.id}`, { data: { status: 'published' } })
    }
  })

  test('membres : recherche', async ({ page }) => {
    await login(page)
    await page.goto('/admin/cockpit/membres?q=zzzz-introuvable')
    await expect(page.getByText('Aucun résultat.')).toBeVisible({ timeout: 30_000 })
  })

  test('mobile 375 px : annonces et modération ne débordent pas', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page)
    for (const path of ['/admin/cockpit/annonces', '/admin/cockpit/moderation', '/admin/cockpit/membres']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(1)
    }
  })
})
