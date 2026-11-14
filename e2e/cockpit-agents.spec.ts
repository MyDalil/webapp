import { expect, test, type Page } from '@playwright/test'

/**
 * Cockpit /admin, lot 5 : écrans des agents (salle de contrôle, tâches, validation, activité, conversations, mémoire, connecteurs).
 * Crée des comptes et une tâche : bases jetables seulement → @ecriture.
 */
const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }
const CONSEILLER = { email: 'conseiller.e2e@mydalil.com', password: 'Cockpit-test-2026!', name: 'Conseiller Test' }

const SCREENS = [
  ['/admin/cockpit/agents', 'Salle de contrôle'],
  ['/admin/cockpit/taches', 'Tâches'],
  ['/admin/cockpit/validation', 'Validation'],
  ['/admin/cockpit/activite', 'Fil d’activité'],
  ['/admin/cockpit/conversations', 'Conversations'],
  ['/admin/cockpit/memoire', 'Mémoire et skills'],
  ['/admin/cockpit/connecteurs', 'Connecteurs'],
] as const

async function login(page: Page, who: { email: string; password: string }) {
  await page.context().clearCookies()
  const res = await page.request.post('/api/users/login', { data: { email: who.email, password: who.password } })
  expect(res.ok(), `connexion ${who.email}`).toBe(true)
}

test.describe.serial('Cockpit — écrans des agents @ecriture', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    const r = page.request
    await r.post('/api/users/first-register', { data: ADMIN })
    await login(page, ADMIN)
    const exists = await r.get(`/api/users?where[email][equals]=${encodeURIComponent(CONSEILLER.email)}&limit=1`)
    if (((await exists.json()) as { totalDocs: number }).totalDocs === 0) {
      // Un autre fichier de tests peut le créer en même temps : seul compte le résultat.
      const made = await r.post('/api/users', { data: { ...CONSEILLER, role: 'conseiller' } })
      const again = await r.get(`/api/users?where[email][equals]=${encodeURIComponent(CONSEILLER.email)}&limit=1`)
      expect(made.ok() || ((await again.json()) as { totalDocs: number }).totalDocs === 1, 'création du conseiller de test').toBe(true)
    }
    await page.close()
  })

  for (const [path, title] of SCREENS) {
    test(`${title} : s’ouvre pour l’administrateur`, async ({ page }) => {
      await login(page, ADMIN)
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText('Accès réservé')).toHaveCount(0)
    })
  }

  test('Salle de contrôle : arrêt général, rôles actifs et réserve', async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/admin/cockpit/agents')
    await expect(page.getByRole('radiogroup', { name: 'Arrêt général' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('heading', { level: 2, name: /Rôles en réserve · \d+/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Activer' }).first()).toBeVisible()
  })

  test('Tâches : une tâche créée par le formulaire apparaît dans le tableau', async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/admin/cockpit/taches')
    const title = `Tâche e2e ${Date.now()}`
    await page.getByLabel('Titre de la tâche').fill(title)
    await page.getByLabel(/Consignes : quoi/).fill('Vérifier les horaires de la fiche de test. Sources : site officiel.')
    await page.getByRole('button', { name: 'Créer la tâche' }).click()
    const link = page.getByRole('link', { name: new RegExp(title) })
    await expect(link).toBeVisible({ timeout: 20_000 })
    // Annulée aussitôt : elle ne doit pas occuper la file des agents pendant les autres tests.
    const id = Number((await link.getAttribute('href'))?.split('/').pop())
    expect((await page.request.patch(`/api/agent-tasks/${id}`, { data: { status: 'cancelled' } })).ok()).toBe(true)
  })

  test('Connecteurs : présence des clés seulement, jamais leur valeur', async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/admin/cockpit/connecteurs')
    await expect(page.getByText('Neon Postgres')).toBeVisible({ timeout: 30_000 })
    const html = await page.content()
    for (const v of [process.env.TELEGRAM_WEBHOOK_SECRET, process.env.DALIL_DATABASE_URL, process.env.PAYLOAD_SECRET]) if (v) expect(html).not.toContain(v)
  })

  test('mobile 375 px : la salle de contrôle ne déborde pas', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page, ADMIN)
    await page.goto('/admin/cockpit/agents')
    await expect(page.getByRole('heading', { level: 1, name: 'Salle de contrôle' })).toBeVisible({ timeout: 30_000 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('conseiller : écran refusé et absent de son menu', async ({ page }) => {
    await login(page, CONSEILLER)
    await page.goto('/admin/cockpit/agents')
    await expect(page.getByText('Accès réservé à Saïd et aux administrateurs.')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('nav a[href="/admin/cockpit/agents"]')).toHaveCount(0)
  })

  test('sans compte : renvoi vers la connexion', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin/cockpit/validation')
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 30_000 })
  })
})
