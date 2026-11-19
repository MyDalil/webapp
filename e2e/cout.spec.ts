import { expect, test } from '@playwright/test'

/**
 * Coût minimal (lecture seule) : une page publique vue sans compte ne précharge aucun lien, n’appelle ni le compte
 * (après la première visite) ni les favoris, et ne charge aucune ressource introuvable.
 */
for (const path of ['/', '/annuaire/sante-soins/hopitaux']) {
  test(`coût d’une visite sans compte : ${path}`, async ({ page }) => {
    const seen = { total: 0, ours: 0, rsc: 0, compte: 0, favoris: 0, notFound: [] as string[] }
    let origin = ''
    const third: Record<string, number> = {} // services tiers, pour comprendre un dépassement
    page.on('request', (r) => {
      const u = new URL(r.url())
      seen.total++
      // Ce que DALIL paie (Vercel, Neon) : les requêtes vers son propre site. Fond de carte (OpenFreeMap) et photos libres (Wikimedia) sont des services tiers gratuits.
      if (u.origin === origin) seen.ours++
      else third[`${u.host}${u.pathname.split('/').slice(0, 2).join('/')}`] = (third[`${u.host}${u.pathname.split('/').slice(0, 2).join('/')}`] ?? 0) + 1
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
    console.log(`COUT ${path} ${JSON.stringify({ ...seen, notFound: seen.notFound.length, third })}`)
    expect(seen.notFound, 'ressources introuvables').toEqual([])
    expect(seen.rsc, 'aucun préchargement de lien').toBe(0)
    expect(seen.favoris, 'aucun appel de favoris').toBe(0)
    expect(seen.compte, 'une vérification de compte au plus').toBeLessThanOrEqual(1)
    // Seuils : mesure du 16/11/2026 (accueil 39, liste 33 vers DALIL) + 15 % environ ; total inchangé.
    expect(seen.ours, 'requêtes vers DALIL').toBeLessThan(path === '/' ? 46 : 39)
    // Liste : 64 depuis que la carte se dessine (2026-11-16). Le worker MapLibre réparé charge aussi
    // les polices des noms de lieux (3 requêtes OpenFreeMap) : mesuré 61 en CI, dont 32 vers DALIL.
    expect(seen.total, 'requêtes de la page, services tiers compris').toBeLessThan(path === '/' ? 120 : 64)
  })
}
