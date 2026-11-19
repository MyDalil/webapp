import { expect, test } from '@playwright/test'
import { apiOnly, ensureAdmin } from './comptes'

/**
 * Import CSV d’adresses (src/app/api/ops/import-csv/route.ts → action importer_csv) : simulation sans écriture,
 * confirmation en brouillon « À vérifier », doublons détectés (dans le fichier et contre la base). Écrit → @ecriture.
 */
test.describe.serial('Import CSV @ecriture', () => {
  test.beforeEach(() => test.skip(apiOnly(test.info().project.name), 'une seule passe suffit'))

  const stamp = Date.now()
  const nom = `Pharmacie Import E2E ${stamp}`
  const csv = [
    'nom;secteur;categorie;wilaya;ville;telephone;source',
    `${nom};sante-soins;Pharmacies;16;Alger;;https://exemple.dz/source`,
    `${nom};sante-soins;Pharmacies;16;Alger;;https://exemple.dz/source`,
    `Sans secteur ${stamp};;Pharmacies;16;Alger;;`,
  ].join('\n')

  test('sans session : refusé', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    expect((await anon.post('/api/ops/import-csv', { data: { csv } })).status()).toBe(401)
    await anon.dispose()
  })

  test('simulation : 1 à créer, 1 doublon dans le fichier, 1 erreur, rien d’écrit', async ({ request }) => {
    await ensureAdmin(request)
    const res = await request.post('/api/ops/import-csv', { data: { csv } })
    expect(res.status(), await res.text()).toBe(200)
    const r = await res.json()
    expect(r.mode).toBe('simulation')
    expect(r.lignes).toBe(3)
    expect(r.aCreer).toHaveLength(1)
    expect(r.aCreer[0].name).toBe(nom)
    expect(r.doublons).toHaveLength(1)
    expect(r.doublons[0].reason).toBe('nom et commune')
    expect(r.erreurs).toHaveLength(1)
    expect(r.erreurs[0].errors.join(' ')).toMatch(/secteur/)
    expect(r.crees).toBeUndefined()
    const found = await (await request.get(`/api/places?where[name][equals]=${encodeURIComponent(nom)}&draft=true&limit=5`)).json()
    expect(found.totalDocs).toBe(0)
  })

  test('confirmation : une fiche en brouillon « À vérifier », puis doublon contre la base', async ({ request }) => {
    await ensureAdmin(request)
    const res = await request.post('/api/ops/import-csv', { data: { csv, confirmer: true } })
    expect(res.status(), await res.text()).toBe(200)
    const r = await res.json()
    expect(r.mode).toBe('confirme')
    expect(r.crees).toHaveLength(1)
    expect(r.echecs).toEqual([])
    const id = r.crees[0].id
    const doc = await (await request.get(`/api/places/${id}?draft=true&depth=0`)).json()
    expect(doc._status).toBe('draft')
    expect(doc.verification).toBe('spotted')

    const again = await (await request.post('/api/ops/import-csv', { data: { csv } })).json()
    expect(again.aCreer).toHaveLength(0)
    expect(again.doublons.some((d: { existing: { id: number | string } }) => String(d.existing.id) === String(id)), 'doublon de la fiche importée').toBe(true)
  })
})
