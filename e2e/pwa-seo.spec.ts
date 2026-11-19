import { expect, test } from '@playwright/test'
import { apiOnly } from './comptes'

/**
 * Application installable et référencement (lecture seule, joué aussi sur le déploiement) :
 * manifest, service worker, page hors-ligne, robots.txt, llms.txt, schema.org et aperçu de lien d’une fiche.
 * `E2E_EXPECT_PRODUCTION` : le déploiement de production (robots ouverts, GPTBot autorisé).
 */
const FICHE = '/adresses/darna-said-hamdine'
const ldBlocks = (html: string) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])

test.describe('PWA et référencement', () => {
  test.beforeEach(() => test.skip(apiOnly(test.info().project.name), 'une seule passe suffit'))

  test('manifest.webmanifest : nom, démarrage, icônes', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest')
    expect(res.status()).toBe(200)
    const m = await res.json()
    expect(m.short_name).toBe('DALIL')
    expect(m.start_url).toBe('/')
    expect(m.display).toBe('standalone')
    expect(m.icons.length).toBeGreaterThanOrEqual(2)
    for (const icon of m.icons as { src: string }[]) expect((await request.get(icon.src)).status(), icon.src).toBe(200)
  })

  test('sw.js : servi en JavaScript avec Service-Worker-Allowed', async ({ request }) => {
    const res = await request.get('/sw.js')
    expect(res.status()).toBe(200)
    expect(res.headers()['service-worker-allowed']).toBe('/')
    expect(res.headers()['content-type']).toMatch(/javascript/)
  })

  test('page hors-ligne', async ({ request }) => {
    const res = await request.get('/offline.html')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toMatch(/text\/html/)
    expect(await res.text()).toMatch(/DALIL/)
  })

  test('robots.txt : IA autorisées en production seulement', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text()
    if (process.env.E2E_EXPECT_PRODUCTION) {
      expect(body).toMatch(/User-Agent: GPTBot/i)
      expect(body).toMatch(/User-Agent: ClaudeBot/i)
      expect(body).toMatch(/User-Agent: Bytespider[\s\S]*?Disallow: \/\s*$/im)
    } else {
      // CI et preview : tout est bloqué, aucun robot nommé (VERCEL_ENV ≠ production).
      expect(body).toMatch(/Disallow: \/\s*$/m)
      expect(body).not.toMatch(/GPTBot/)
    }
  })

  test('llms.txt : texte brut qui présente DALIL', async ({ request }) => {
    const res = await request.get('/llms.txt')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toMatch(/text\/plain/)
    const text = await res.text()
    expect(text).toMatch(/^# /m)
    expect(text).toContain('DALIL')
  })

  test('fiche adresse : JSON-LD valide (lieu + fil d’Ariane)', async ({ request }) => {
    const res = await request.get(FICHE)
    expect(res.status()).toBe(200)
    const blocks = ldBlocks(await res.text())
    expect(blocks.length).toBeGreaterThan(0)
    const items = blocks.flatMap((b) => {
      const j = JSON.parse(b) as unknown
      return Array.isArray(j) ? j : (j as { '@graph'?: unknown[] })['@graph'] ?? [j]
    }) as Record<string, unknown>[]
    const types = items.map((i) => String(i['@type']))
    expect(types).toContain('BreadcrumbList')
    const place = items.find((i) => i['@type'] !== 'BreadcrumbList' && typeof i.name === 'string')
    expect(place, `données du lieu (types : ${types.join(', ')})`).toBeTruthy()
    expect(String(place!.url ?? '')).toContain('/adresses/darna-said-hamdine')
    for (const b of blocks) expect(b, 'aucun </script> injecté').not.toMatch(/<\/script/i)
  })

  test('fiche adresse : aperçu de lien (opengraph-image) en PNG', async ({ request }) => {
    const html = await (await request.get(FICHE)).text()
    const og = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1]?.replace(/&amp;/g, '&')
    const path = og && og.includes('opengraph-image') ? new URL(og).pathname + new URL(og).search : `${FICHE}/opengraph-image`
    const res = await request.get(path)
    expect(res.status(), path).toBe(200)
    expect(res.headers()['content-type']).toBe('image/png')
    expect((await res.body()).subarray(1, 4).toString()).toBe('PNG')
  })
})
