import { expect, test } from '@playwright/test'

/**
 * Coût minimal (lecture seule) : une page publique vue sans compte ne précharge aucun lien, n’appelle ni le compte
 * (après la première visite) ni les favoris, et ne charge aucune ressource introuvable.
 */
for (const path of ['/', '/annuaire/sante-soins/hopitaux']) {
  test(`coût d’une visite sans compte : ${path}`, async ({ page }) => {
    const seen = { total: 0, ours: 0, rsc: 0, compte: 0, favoris: 0, notFound: [] as string[] }
    let origin = ''
    page.on('request', (r) => {
      const u = new URL(r.url())
      seen.total++
      // Ce que DALIL paie (Vercel, Neon) : les requêtes vers son propre site. Fond de carte (OpenFreeMap) et photos libres (Wikimedia) sont des services tiers gratuits.
      if (u.origin === origin) seen.ours++
      if (u.searchParams.has('_rsc')) seen.rsc++
      if (u.pathname === '/api/compte') seen.compte++
      if (u.pathname === '/api/favorites') seen.favoris++
    })
    page.on('response', (r) => { if (r.status() === 404) seen.notFound.push(r.url()) })
    origin = new URL(page.url() === 'about:blank' ? (test.info().project.use.baseURL ?? 'http://localhost:3000') : page.url()).origin
    await page.goto(path)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(1500)
    await page.mouse.wheel(0, 6000)
    await page.waitForTimeout(1500)
    console.log(`COUT ${path} ${JSON.stringify({ ...seen, notFound: seen.notFound.length })}`)
    expect(seen.notFound, 'ressources introuvables').toEqual([])
    expect(seen.rsc, 'aucun préchargement de lien').toBe(0)
    expect(seen.favoris, 'aucun appel de favoris').toBe(0)
    expect(seen.compte, 'une vérification de compte au plus').toBeLessThanOrEqual(1)
    expect(seen.ours, 'requêtes vers DALIL').toBeLessThan(path === '/' ? 60 : 45)
    expect(seen.total, 'requêtes de la page, services tiers compris').toBeLessThan(path === '/' ? 140 : 90)
  })
}
