import { expect, test, type Page } from '@playwright/test'

/**
 * Cockpit /admin (lot 1). Crée ses comptes de test : réservé aux bases jetables (CI, local) → @ecriture.
 * Premier compte = administrateur (adresse de l’équipe), puis un compte « conseiller ».
 */
const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }
const CONSEILLER = { email: 'conseiller.e2e@mydalil.com', password: 'Cockpit-test-2026!', name: 'Conseiller Test' }

async function ensureUsers(page: Page) {
  const r = page.request
  await r.post('/api/users/first-register', { data: ADMIN }) // sans effet si un compte existe déjà
  const login = await r.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })
  expect(login.ok(), 'connexion admin de test').toBe(true)
  const exists = await r.get(`/api/users?where[email][equals]=${encodeURIComponent(CONSEILLER.email)}&limit=1`)
  if (((await exists.json()) as { totalDocs: number }).totalDocs === 0) {
    // Un autre fichier de tests peut le créer en même temps : seul compte le résultat.
    const created = await r.post('/api/users', { data: { ...CONSEILLER, role: 'conseiller' } })
    const again = await r.get(`/api/users?where[email][equals]=${encodeURIComponent(CONSEILLER.email)}&limit=1`)
    expect(created.ok() || ((await again.json()) as { totalDocs: number }).totalDocs === 1, 'création du conseiller de test').toBe(true)
  }
}

async function loginAs(page: Page, who: { email: string; password: string }) {
  await page.context().clearCookies()
  const res = await page.request.post('/api/users/login', { data: { email: who.email, password: who.password } })
  expect(res.ok()).toBe(true)
}

test.describe.serial('Cockpit admin @ecriture', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await ensureUsers(page)
    await page.close()
  })

  test('Pilotage : salutation, 8 indicateurs et menu par groupes', async ({ page }) => {
    await loginAs(page, ADMIN)
    await page.goto('/admin')
    await expect(page.getByRole('heading', { level: 1, name: /Bonjour Saïd/ })).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('.dl-kpi')).toHaveCount(8)
    await expect(page.getByRole('heading', { level: 2, name: 'Fil d’activité' })).toBeVisible()
    for (const g of ['Pilotage', 'Agents', 'Contenu', 'Communauté', 'Communication', 'Système']) await expect(page.locator('.dl-grp', { hasText: g })).toHaveCount(1)
    await expect(page.locator('.dl-nv[aria-current="page"]')).toHaveText(/Vue d’ensemble/)
    if (test.info().project.name === 'ordinateur') await expect(page.locator('aside.dl-nav')).toHaveClass(/nav--nav-open/)
  })

  test('chaque entrée du menu mène à une page qui répond', async ({ page }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit')
    await loginAs(page, ADMIN)
    await page.goto('/admin')
    const hrefs = await page.locator('.dl-nv[href^="/admin"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')!))
    expect(hrefs.length).toBeGreaterThan(30)
    for (const h of hrefs) {
      const res = await page.request.get(h)
      expect(res.status(), h).toBeLessThan(400)
    }
  })

  test('palette ⌘K : trouve une page du menu', async ({ page }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'clavier physique')
    await loginAs(page, ADMIN)
    await page.goto('/admin')
    await expect(page.locator('.dl-cmd')).toBeVisible({ timeout: 30_000 })
    // Le raccourci n’agit qu’une fois la page hydratée : on réessaie jusqu’à l’ouverture de la palette.
    await expect(async () => {
      await page.keyboard.press('Control+k')
      await expect(page.getByRole('combobox')).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 30_000 })
    await page.getByRole('combobox').fill('médiat')
    await expect(page.getByRole('option', { name: /Médiathèque/ })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/admin\/cockpit\/medias/)
  })

  test('mode sombre conservé après rechargement', async ({ page }) => {
    await loginAs(page, ADMIN)
    await page.goto('/admin')
    const html = page.locator('html')
    const before = await html.getAttribute('data-theme')
    await page.locator('.dl-bar button[aria-label="Mode clair ou sombre"]').click()
    const want = before === 'dark' ? 'light' : 'dark'
    await expect(html).toHaveAttribute('data-theme', want)
    await page.reload()
    await expect(html).toHaveAttribute('data-theme', want)
  })

  test('arabe : tout l’admin passe en RTL, puis retour au français', async ({ page }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'sélecteur de langue visible sur grand écran')
    await loginAs(page, ADMIN)
    await page.goto('/admin')
    await page.locator('.dl-bar .dl-seg button[lang="ar"]').click()
    await expect(page.locator('html')).toHaveAttribute('dir', /rtl/i, { timeout: 15_000 })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/مرحبًا/)
    await page.locator('.dl-bar .dl-seg button[lang="fr"]').click()
    await expect(page.locator('html')).toHaveAttribute('dir', /ltr/i, { timeout: 15_000 })
  })

  test('mobile 375 px : le menu s’ouvre et ses cibles font au moins 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await loginAs(page, ADMIN)
    await page.goto('/admin')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, 'aucun défilement horizontal').toBeLessThanOrEqual(0)
    const toggler = page.locator('.app-header__mobile-nav-toggler')
    const tb = await toggler.boundingBox()
    expect(Math.min(tb?.width ?? 0, tb?.height ?? 0), 'bouton menu ≥ 44 px').toBeGreaterThanOrEqual(44)
    await toggler.click()
    const first = page.locator('.dl-nv').first()
    await expect(first).toBeVisible()
    const box = await first.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  })

  test('un conseiller ne voit que l’accompagnement', async ({ page }) => {
    await loginAs(page, CONSEILLER)
    await page.goto('/admin/collections/demandes-accompagnement')
    const items = page.locator('.dl-nv[href^="/admin/"]:not([href="/admin/logout"])')
    await expect(items).toHaveCount(1, { timeout: 30_000 })
    await expect(items).toHaveAttribute('href', '/admin/collections/demandes-accompagnement')
  })
})
