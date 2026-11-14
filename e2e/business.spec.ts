import { expect, test, type Page } from '@playwright/test'

/** Business (lot 10b) : Analytics, Newsletter, Finances, SEO, Couverture, Traductions, Recherches sans résultat. Crée le compte de test → @ecriture. */
const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }

async function login(page: Page) {
  await page.context().clearCookies()
  await page.request.post('/api/users/first-register', { data: ADMIN })
  expect((await page.request.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })).ok()).toBe(true)
}

const SCREENS = [
  ['/admin/cockpit/analytics', 'Analytics'],
  ['/admin/cockpit/newsletter', 'Newsletter'],
  ['/admin/cockpit/finances', 'Finances'],
  ['/admin/cockpit/seo', 'SEO'],
  ['/admin/cockpit/couverture', 'Couverture'],
  ['/admin/cockpit/traductions', 'Traductions'],
  ['/admin/cockpit/recherches', 'Recherches sans résultat'],
] as const

test.describe('Cockpit — Business @ecriture', () => {
  for (const [path, title] of SCREENS) {
    test(`${title} : s’ouvre`, async ({ page }) => {
      await login(page)
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible({ timeout: 30_000 })
    })
  }

  test('Finances : aucun encaissement affiché comme réel', async ({ page }) => {
    await login(page)
    await page.goto('/admin/cockpit/finances')
    await expect(page.getByText('Encaissé (paiement non branché)')).toBeVisible({ timeout: 30_000 })
  })

  test('recherche sans résultat : notée, numéro jamais gardé', async ({ page }) => {
    const term = `zqxw${Date.now().toString(36)}`
    await page.goto(`/recherche?q=${term}`)
    await page.goto(`/recherche?q=${encodeURIComponent('zqxw 0550 12 34 56')}`)
    await login(page)
    await page.goto('/admin/cockpit/recherches')
    await expect(page.getByRole('cell', { name: term })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('0550')).toHaveCount(0)
  })

  test('mobile 375 px : aucun débordement', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page)
    for (const [path] of SCREENS) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(1)
    }
  })
})
