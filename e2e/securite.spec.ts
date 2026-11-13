import { expect, test } from '@playwright/test'

/** Audit interne du 2 novembre 2026 (A01, A04, A14) : protections vérifiées côté serveur, en visiteur anonyme. */
const INTERNAL = ['internalNote', 'provenance', 'legalNumber', 'backgroundCheckedAt', 'owner']

test.describe('Sécurité des API publiques', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit'))

  test('REST : aucun champ interne, coordonnées seulement si « Afficher les coordonnées »', async ({ request }) => {
    for (const collection of ['places', 'practitioners', 'providers']) {
      const res = await request.get(`/api/${collection}?limit=50&depth=1`)
      expect(res.status(), collection).toBe(200)
      const { docs } = (await res.json()) as { docs: Record<string, unknown>[] }
      for (const d of docs) {
        // Champ interne absent (ou liste vide pour un tableau : Payload garde la clé, jamais les valeurs).
        for (const f of INTERNAL) expect(Array.isArray(d[f]) ? (d[f] as unknown[]).length : d[f], `${collection}.${f}`).toBeFalsy()
        expect((d.source as { notes?: unknown } | undefined)?.notes, `${collection}.source.notes`).toBeUndefined()
        if (collection === 'places' && !d.showContacts) for (const f of ['phone', 'whatsapp', 'email']) expect(d[f], `places.${f}`).toBeUndefined()
        for (const c of (d.closures as { note?: unknown }[] | undefined) ?? []) expect(c.note).toBeUndefined()
      }
    }
  })

  test('GraphQL : désactivé (une seule API publique, REST)', async ({ request }) => {
    const res = await request.post('/api/graphql', { data: { query: '{ Places(limit: 1) { docs { internalNote } } }' } })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(await res.text()).not.toContain('internalNote')
  })

  test('tâche quotidienne : refusée sans secret valide, même avec un faux user-agent', async ({ request }) => {
    const spoof = await request.get('/api/taches', { headers: { 'user-agent': 'vercel-cron/1.0' } })
    expect([401, 503]).toContain(spoof.status())
    const wrong = await request.get('/api/taches', { headers: { authorization: 'Bearer faux' } })
    expect([401, 503]).toContain(wrong.status())
  })

  test('/api/sante : JSON strict avec battement de la tâche quotidienne', async ({ request }) => {
    const res = await request.get('/api/sante')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.base).toBe('ok')
    expect(body.taches).toHaveProperty('ok')
  })

  test('webhook Resend : signature exigée', async ({ request }) => {
    const res = await request.post('/api/resend/evenements', { data: { type: 'email.delivered', data: { email_id: 'x' } } })
    expect([401, 503]).toContain(res.status())
  })
})
