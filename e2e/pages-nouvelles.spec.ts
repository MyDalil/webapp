import { expect, test } from '@playwright/test'
import { apiOnly, ensureAdmin } from './comptes'

/**
 * Nouveautés des pages publiques : FAQ (rien sans question publiée), libellé « Sponsorisé »
 * (indépendant de la vérification, règle 4), pages « moments » (404 si inconnue).
 */
const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const CATEGORY_PAGE = '/annuaire/sante-soins/pharmacies'

test.describe('Pages : FAQ et moments', () => {
  test('/moments/inconnu : 404', async ({ request }) => {
    expect((await request.get('/moments/inconnu-e2e')).status()).toBe(404)
  })

  test('FAQ absente quand aucune question publiée pour la page', async ({ page, request }) => {
    const faqs = await request.get(`/api/faqs?where[scope][equals]=${encodeURIComponent(CATEGORY_PAGE)}&where[published][equals]=true&limit=1`)
    test.skip(faqs.ok() && (await faqs.json()).totalDocs > 0, 'une question est publiée pour cette page')
    const res = await page.goto(CATEGORY_PAGE)
    expect(res?.status()).toBe(200)
    await expect(page.locator('#faq-titre')).toHaveCount(0)
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(ld.join('\n')).not.toContain('FAQPage')
  })
})

test.describe.serial('Pages : sponsorisation @ecriture', () => {
  test.beforeEach(() => test.skip(apiOnly(test.info().project.name), 'une seule passe suffit'))

  test('sponsorisation active : fiche en tête marquée « Sponsorisé », vérification inchangée', async ({ page }) => {
    test.setTimeout(120_000)
    const r = page.request
    await ensureAdmin(r)
    const place = (await (await r.get('/api/places?where[slug][equals]=darna-said-hamdine&limit=1&depth=0')).json()).docs[0] as { id: number; name: string; sector: string; category: string; verification: string }
    expect(place, 'fiche publiée de référence').toBeTruthy()
    const path = `/annuaire/${place.sector}/${slugify(place.category)}`
    const now = Date.now()
    const created = await r.post('/api/sponsorships', {
      data: { targetCollection: 'places', targetId: String(place.id), kind: 'a-la-une', startsAt: new Date(now - 3_600_000).toISOString(), endsAt: new Date(now + 86_400_000).toISOString(), status: 'active', paymentNote: 'test e2e' },
    })
    expect(created.ok(), await created.text()).toBe(true)
    const sid = (await created.json()).doc.id

    try {
      // Cache des sponsorisations : 60 s au plus.
      await expect(async () => {
        await page.goto(path)
        const box = page.locator('[data-sponsored="true"]')
        await expect(box).toBeVisible({ timeout: 2_000 })
        await expect(box).toContainText('Sponsorisé')
        await expect(box).toContainText(place.name)
      }).toPass({ timeout: 90_000, intervals: [5_000, 10_000, 15_000] })
      const after = await (await r.get(`/api/places/${place.id}?depth=0`)).json()
      expect(after.verification, 'la sponsorisation ne touche pas la vérification').toBe(place.verification)
    } finally {
      await r.patch(`/api/sponsorships/${sid}`, { data: { status: 'terminee' } })
    }
  })
})
