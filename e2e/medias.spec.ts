import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'

/**
 * Médiathèque du cockpit (lot 6) : glisser-déposer, doublons, 4 formats WebP, point focal, remplacement partout.
 * Crée des photos et un message Telegram de test : bases jetables seulement → @ecriture.
 */
const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }

async function login(page: Page) {
  await page.context().clearCookies()
  await page.request.post('/api/users/first-register', { data: ADMIN })
  expect((await page.request.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })).ok()).toBe(true)
}

/** Photo unique à chaque exécution (couleur tirée au hasard) : pas de faux doublon entre deux passages. */
const photo = async (w = 1200, h = 800) => {
  const c = () => Math.floor(Math.random() * 256)
  return sharp({ create: { width: w, height: h, channels: 3, background: { r: c(), g: c(), b: c() } } }).jpeg().toBuffer()
}

test.describe.serial('Cockpit — Médiathèque @ecriture', () => {
  let buffer: Buffer
  const alt = `Photo e2e ${Date.now()}`

  test('glisser-déposer : envoi avec description, puis la photo apparaît', async ({ page }) => {
    buffer = await photo(2000, 1400)
    await login(page)
    await page.goto('/admin/cockpit/medias')
    await expect(page.getByRole('heading', { level: 1, name: 'Médiathèque' })).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('media-input').setInputFiles({ name: 'essai.jpg', mimeType: 'image/jpeg', buffer })
    const field = page.getByLabel('Description (français) — essai.jpg')
    await expect(field).toHaveValue('essai')
    await field.fill(alt)
    await page.getByRole('button', { name: /^Envoyer \(1\)$/ }).click()
    await expect(page.getByText('Envoyée', { exact: true })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('link', { name: new RegExp(alt) })).toBeVisible({ timeout: 20_000 })
  })

  test('même fichier une seconde fois : doublon signalé avant l’envoi', async ({ page }) => {
    await login(page)
    await page.goto('/admin/cockpit/medias')
    await page.getByTestId('media-input').setInputFiles({ name: 'encore.jpg', mimeType: 'image/jpeg', buffer })
    await expect(page.getByText('Déjà dans la médiathèque :')).toBeVisible({ timeout: 20_000 })
  })

  test('fiche de la photo : 4 formats WebP produits, point focal enregistré', async ({ page }) => {
    await login(page)
    await page.goto('/admin/cockpit/medias')
    await page.getByRole('link', { name: new RegExp(alt) }).click()
    await expect(page.getByRole('heading', { level: 2, name: new RegExp(alt) })).toBeVisible({ timeout: 20_000 })
    for (const s of ['Vignette 480 × 360', 'Carte 800 × 600', 'Couverture 1600 × 900', 'Partage 1200 × 630']) {
      await expect(page.getByRole('row', { name: new RegExp(s) })).not.toContainText('non produit')
    }
    await page.getByRole('button', { name: /Point focal/ }).click({ position: { x: 10, y: 10 } })
    await expect(page.getByText(/formats recadrés/)).toBeVisible({ timeout: 20_000 })
  })

  test('remplacer partout : un message passe de la photo A à la photo B', async ({ request }) => {
    const r = request
    await r.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })
    const up = async (name: string) => {
      const res = await r.post('/api/media', { multipart: { file: { name, mimeType: 'image/jpeg', buffer: await photo(1000, 700) }, _payload: JSON.stringify({ alt: name }) } })
      expect(res.ok(), `envoi ${name}`).toBe(true)
      return ((await res.json()) as { doc: { id: number; hash: string; sizes: Record<string, { mimeType: string }> } }).doc
    }
    const a = await up('A e2e'), b = await up('B e2e')
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(a.sizes.card.mimeType).toBe('image/webp')
    const post = await r.post('/api/telegram-posts', { data: { title: 'Remplacement e2e', text: 'Texte', photo: a.id } })
    expect(post.ok()).toBe(true)
    const rep = await r.post('/api/medias/replace', { data: { from: a.id, to: b.id } })
    expect(rep.status()).toBe(200)
    expect(((await (await r.get(`/api/medias/usage?id=${a.id}`)).json()) as { uses: unknown[] }).uses).toHaveLength(0)
    expect(((await (await r.get(`/api/medias/usage?id=${b.id}`)).json()) as { uses: Array<{ title: string }> }).uses.map((u) => u.title)).toContain('Remplacement e2e')
  })

  test('mobile 375 px : la médiathèque ne déborde pas', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page)
    await page.goto('/admin/cockpit/medias')
    await expect(page.getByRole('heading', { level: 1, name: 'Médiathèque' })).toBeVisible({ timeout: 30_000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
  })

  test('sans compte : utilisation et remplacement refusés', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    expect((await anon.get('/api/medias/usage?id=1')).status()).toBe(401)
    expect((await anon.post('/api/medias/replace', { data: { from: 1, to: 2 } })).status()).toBe(401)
    await anon.dispose()
  })
})
