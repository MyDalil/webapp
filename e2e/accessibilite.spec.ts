import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * Accessibilité du cockpit (lot 11) : WCAG 2.1 A et AA (axe-core) sur chaque écran, en mode clair et en mode sombre.
 * Crée le compte de test → @ecriture.
 */
const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }
const SCREENS = ['', '/cockpit/agents', '/cockpit/taches', '/cockpit/validation', '/cockpit/activite', '/cockpit/conversations', '/cockpit/memoire', '/cockpit/connecteurs', '/cockpit/medias', '/cockpit/historique', '/cockpit/boite', '/cockpit/moderation', '/cockpit/annonces', '/cockpit/pros', '/cockpit/membres', '/cockpit/ia', '/cockpit/sante', '/cockpit/securite', '/cockpit/analytics', '/cockpit/newsletter', '/cockpit/finances', '/cockpit/seo', '/cockpit/couverture', '/cockpit/traductions', '/cockpit/recherches']

async function login(page: Page) {
  await page.context().clearCookies()
  await page.request.post('/api/users/first-register', { data: ADMIN })
  expect((await page.request.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })).ok()).toBe(true)
}

for (const theme of ['light', 'dark'] as const) {
  test(`accessibilité WCAG AA — mode ${theme === 'light' ? 'clair' : 'sombre'} @ecriture`, async ({ page, baseURL }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'un passage par thème suffit')
    test.setTimeout(240_000)
    await login(page)
    // Thème lu par Payload dans le cookie « payload-theme », avant le premier rendu.
    await page.context().addCookies([{ name: 'payload-theme', value: theme, url: baseURL! }])
    const report: string[] = []
    for (const s of SCREENS) {
      await page.goto(`/admin${s}`)
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 })
      expect(await page.locator('html').getAttribute('data-theme')).toBe(theme)
      // Seulement le contenu du cockpit et sa navigation : les écrans natifs de Payload ne sont pas audités ici.
      const r = await new AxeBuilder({ page }).include('.dl').include('.dl-nav').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      for (const v of r.violations) report.push(`${s || '/'} · ${v.id} (${v.impact}) · ${v.nodes.length} · ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`)
    }
    expect(report, report.join('\n')).toEqual([])
  })
}
