import { expect, test } from '@playwright/test'
import pg from 'pg'

test.describe('Santé et erreurs', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit'))

  test('/api/sante : application et base répondent', async ({ request }) => {
    const res = await request.get('/api/sante')
    expect(res.status()).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, base: 'ok' })
  })

  test('une erreur serveur est journalisée une seule fois puis comptée @ecriture', async ({ request }) => {
    test.skip(!process.env.DALIL_TEST_ERRORS || !process.env.DALIL_DATABASE_URL, 'serveur local de test seulement')
    const db = new pg.Client({ connectionString: process.env.DALIL_DATABASE_URL })
    await db.connect()
    const count = async () => {
      const { rows } = await db.query(`SELECT count(*)::int AS lignes, COALESCE(SUM(count), 0)::int AS n FROM error_logs WHERE message = 'Erreur simulée pour le test du journal'`)
      return rows[0] as { lignes: number; n: number }
    }
    const before = (await count()).n
    for (let i = 0; i < 2; i++) expect((await request.get('/api/sante?simuler-erreur=1')).status()).toBe(500)
    await expect.poll(async () => (await count()).n).toBe(before + 2)
    expect((await count()).lignes).toBe(1)
    await db.end()
  })
})
