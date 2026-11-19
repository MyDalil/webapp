import { expect, test } from '@playwright/test'
import { ensureAdmin } from './comptes'

/**
 * Vue « Validation » de /admin (lot K) : un brouillon apparaît dans la file unique, et le bouton « Publier »
 * (action `publier_fiche` du registre, canal admin) le publie. Rien n’est publié sans ce clic.
 */
test.describe('Validation de l’équipe', () => {
  test('un brouillon apparaît dans /admin/validation et se publie par le bouton @ecriture', async ({ page }, info) => {
    test.skip(info.project.name !== 'ordinateur', 'vue d’administration : une passe ordinateur suffit')
    await ensureAdmin(page.request)
    const name = `Brouillon validation e2e ${Date.now()}`
    const created = await page.request.post('/api/places?draft=true', {
      data: { name, sector: 'restaurants-gastronomie', category: 'Restaurants', city: 'Alger', wilaya: '16', verification: 'spotted', _status: 'draft' },
    })
    expect(created.ok(), 'création du brouillon').toBe(true)
    const id = ((await created.json()) as { doc: { id: number } }).doc.id

    await page.goto('/admin/validation')
    await expect(page.getByRole('heading', { name: 'Validation' })).toBeVisible()
    const row = page.locator('.vl-list li').filter({ hasText: name })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Publier' }).click()

    await expect
      .poll(async () => ((await (await page.request.get(`/api/places/${id}?depth=0`)).json()) as { _status?: string })._status, { timeout: 15_000 })
      .toBe('published')
    await page.reload()
    await expect(page.locator('.vl-list li').filter({ hasText: name })).toHaveCount(0)
  })
})
