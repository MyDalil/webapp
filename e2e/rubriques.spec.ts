import { expect, test } from '@playwright/test'
import { ensureAdmin } from './comptes'

/**
 * Interrupteurs de /admin/rubriques : couper une catégorie → sa page publique affiche « revient sous peu » (200, noindex) ;
 * la rallumer → contenu normal. La bascule passe par l’action `basculer_section` du registre (canal admin, audit).
 */
const KEY = 'c:sante-soins/pharmacies'
const PAGE = '/annuaire/sante-soins/pharmacies'

test.describe('Rubriques coupées', () => {
  test('couper puis rallumer une catégorie depuis /admin/rubriques @ecriture', async ({ page }, info) => {
    test.skip(info.project.name !== 'ordinateur', 'vue d’administration : une passe ordinateur suffit')
    await ensureAdmin(page.request)
    try {
      await page.goto('/admin/rubriques')
      await expect(page.getByRole('heading', { name: 'Rubriques' })).toBeVisible()
      const sante = page.locator('.ct-list > li').filter({ has: page.locator('[data-key="r:sante"]') })
      await sante.locator('summary').click()
      const toggle = page.locator(`[data-key="${KEY}"]`)
      await expect(toggle).toHaveAttribute('aria-checked', 'true')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-checked', 'false')

      const off = await page.goto(PAGE)
      expect(off?.status()).toBe(200)
      await expect(page.locator('[data-section-off]')).toBeVisible()
      await expect(page.locator('[data-section-off] h1')).toHaveText('Cette rubrique revient sous peu.')
      await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1)
      await expect(page.locator('header').first()).toBeVisible()

      await page.goto('/admin/rubriques')
      await page.locator('.ct-list > li').filter({ has: page.locator('[data-key="r:sante"]') }).locator('summary').click()
      await page.locator(`[data-key="${KEY}"]`).click()
      await expect(page.locator(`[data-key="${KEY}"]`)).toHaveAttribute('aria-checked', 'true')

      const on = await page.goto(PAGE)
      expect(on?.status()).toBe(200)
      await expect(page.locator('[data-section-off]')).toHaveCount(0)
      await expect(page.locator('h1').first()).toContainText('Pharmacies')
    } finally {
      await page.request.post('/api/rubriques', { data: { cle: KEY, coupe: false } })
    }
  })

  test('un visiteur ne peut pas basculer une rubrique', async ({ request }) => {
    const r = await request.post('/api/rubriques', { data: { cle: KEY, coupe: true } })
    expect(r.status()).toBe(403)
  })
})
