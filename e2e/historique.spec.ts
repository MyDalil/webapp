import { expect, test, type Page } from '@playwright/test'

/**
 * Historique et corbeille (lot 7) : recherche d’une fiche, aperçu FR/AR/EN, journal, versions,
 * mise à la corbeille puis restauration. Modifie une adresse : bases jetables seulement → @ecriture.
 */
const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }

async function login(page: Page) {
  await page.context().clearCookies()
  await page.request.post('/api/users/first-register', { data: ADMIN })
  expect((await page.request.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })).ok()).toBe(true)
}

test.describe.serial('Cockpit — Historique et corbeille @ecriture', () => {
  test('fiche : recherche, aperçu, journal, corbeille puis restauration', async ({ page }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule fiche modifiée par passage')
    await login(page)
    const r = await page.request.get('/api/places?limit=1&depth=0&where[_status][equals]=published&where[slug][exists]=true&select[name]=true&select[slug]=true')
    const place = ((await r.json()) as { docs: Array<{ id: number; name: string; slug: string }> }).docs[0]
    test.skip(!place, 'aucune adresse publiée dans cette base')

    await page.goto(`/admin/cockpit/historique?q=${encodeURIComponent(place.name.slice(0, 20))}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Historique et corbeille' })).toBeVisible({ timeout: 30_000 })
    await page.getByRole('link', { name: place.name, exact: true }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: place.name })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('heading', { level: 2, name: 'Aperçu' })).toBeVisible()
    await expect(page.locator('iframe.dl-frame')).toHaveAttribute('src', new RegExp(`/api/preview\\?slug=${place.slug}`))
    await page.getByRole('radio', { name: 'العربية' }).click()
    await expect(page.locator('iframe.dl-frame')).toHaveAttribute('src', /lang=ar/)
    await expect(page.getByRole('heading', { level: 2, name: /Journal des modifications/ })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: /Versions/ })).toBeVisible()

    page.on('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Mettre à la corbeille' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Dans la corbeille' })).toBeVisible({ timeout: 20_000 })
    expect((await page.request.get(`/adresses/${place.slug}`)).status()).toBe(404)

    await page.goto('/admin/cockpit/historique')
    await expect(page.getByRole('row', { name: new RegExp(place.name) })).toContainText('30')

    await page.goto(`/admin/cockpit/historique?c=places&id=${place.id}`)
    await page.getByRole('button', { name: 'Restaurer', exact: true }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Dans la corbeille' })).toHaveCount(0, { timeout: 20_000 })
    expect((await page.request.get(`/adresses/${place.slug}`)).status()).toBe(200)
  })

  test('mobile 375 px : l’historique ne déborde pas', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page)
    await page.goto('/admin/cockpit/historique')
    await expect(page.getByRole('heading', { level: 1, name: 'Historique et corbeille' })).toBeVisible({ timeout: 30_000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
  })

  test('sans compte : renvoi vers la connexion ; aperçu refusé', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin/cockpit/historique')
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 30_000 })
    expect((await page.request.get('/api/preview?slug=test')).status()).toBe(401)
  })
})
