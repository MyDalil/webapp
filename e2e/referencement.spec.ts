import { expect, test } from '@playwright/test'

const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
const PRIVATE = /\/(admin|api|mon-compte|espace|espace-pro|missions|connexion|onboarding|recherche|newsletter)(\/|$)|\/annonces\/(deposer|messagerie)/

test.describe('Référencement', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit'))

  test('robots.txt répond et n’ouvre pas le site hors production', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
    const body = await res.text()
    if (process.env.E2E_EXPECT_PRODUCTION) {
      expect(body).toContain('Sitemap:')
      expect(body).toContain('Disallow: /admin')
    } else expect(body).toMatch(/Disallow: \/\s*$/m)
  })

  test('plan du site : index, fichiers valides, aucune page privée', async ({ request }) => {
    const index = await request.get('/sitemap.xml')
    expect(index.status()).toBe(200)
    expect(index.headers()['content-type']).toContain('xml')
    const files = locs(await index.text())
    expect(files.length).toBeGreaterThanOrEqual(4)
    let total = 0
    for (const file of files) {
      const res = await request.get(new URL(file).pathname)
      expect(res.status(), file).toBe(200)
      const urls = locs(await res.text())
      expect(urls.length).toBeLessThanOrEqual(50_000)
      for (const u of urls) expect(new URL(u).pathname, u).not.toMatch(PRIVATE)
      total += urls.length
    }
    expect(total).toBeGreaterThan(100)
  })

  test('plan du site : les pages listées existent', async ({ request }) => {
    const urls = locs(await (await request.get('/sitemaps/pages.xml')).text())
    for (const u of urls.slice(0, 40)) expect((await request.get(new URL(u).pathname)).status(), u).toBe(200)
  })

  test('fichier de plan inconnu : 404', async ({ request }) => {
    expect((await request.get('/sitemaps/inconnu.xml')).status()).toBe(404)
  })
})
