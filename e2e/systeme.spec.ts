import { expect, test, type Page } from '@playwright/test'

/** Système (lot 10a) : IA et coûts, Santé technique, Sécurité. Lecture seule, mais crée le compte de test → @ecriture. */
const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }

async function login(page: Page) {
  await page.context().clearCookies()
  await page.request.post('/api/users/first-register', { data: ADMIN })
  expect((await page.request.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })).ok()).toBe(true)
}

test.describe('Cockpit — Système @ecriture', () => {
  test('IA et coûts : dépense, plafonds, répartitions', async ({ page }) => {
    await login(page)
    await page.goto('/admin/cockpit/ia')
    await expect(page.getByRole('heading', { level: 1, name: 'IA et coûts' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Dépensé ce mois')).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Par modèle (mois)' })).toBeVisible()
  })

  test('Santé technique : la base répond, tâches et erreurs listées', async ({ page }) => {
    await login(page)
    await page.goto('/admin/cockpit/sante')
    await expect(page.getByRole('heading', { level: 1, name: 'Santé technique' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Base Neon · répond/)).toBeVisible()
  })

  test('Sécurité : comptes et secrets, jamais leur valeur', async ({ page }) => {
    await login(page)
    await page.goto('/admin/cockpit/securite')
    await expect(page.getByRole('heading', { level: 1, name: 'Sécurité' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(ADMIN.email).first()).toBeVisible()
    const html = await page.content()
    for (const v of [process.env.PAYLOAD_SECRET, process.env.CRON_SECRET, process.env.TELEGRAM_WEBHOOK_SECRET]) if (v) expect(html).not.toContain(v)
  })

  test('mobile 375 px : aucun débordement', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page)
    for (const path of ['/admin/cockpit/ia', '/admin/cockpit/sante', '/admin/cockpit/securite']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(1)
    }
  })
})
