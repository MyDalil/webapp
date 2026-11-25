import { expect, test, type Page } from '@playwright/test'
import { apiOnly, ensureAdmin, loginMember } from './comptes'

/**
 * Demandes des visiteurs (lot M, collection `leads`) : envoi accepté sur une fiche privée rattachée à un pro,
 * refus sans la case d’accord, refus sur un lieu public (pharmacie, hôpital…). Le destinataire est le propriétaire
 * de la fiche ; `member` du lead = le demandeur connecté (facultatif).
 */
type Body = Record<string, unknown>

/** Envoi depuis le navigateur avec une preuve anti-robot fraîche (même calcul que le formulaire). */
async function sendLead(page: Page, body: Body): Promise<{ status: number; error?: string }> {
  return page.evaluate(async (data) => {
    const { salt, bits, sig } = await (await fetch('/api/preuve')).json()
    const enc = new TextEncoder()
    const zero = (b: Uint8Array) => {
      let n = 0
      for (const x of b) {
        if (x === 0) {
          n += 8
          continue
        }
        return n + Math.clz32(x) - 24
      }
      return n
    }
    let i = 0
    while (zero(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`${salt}:${i}`)))) < bits) i++
    const r = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-dalil-preuve': JSON.stringify({ salt, bits, sig, nonce: String(i) }) },
      body: JSON.stringify(data),
    })
    const j = (await r.json().catch(() => ({}))) as { error?: string }
    return { status: r.status, error: j.error }
  }, body)
}

/** Fiche publiée, rattachée à un compte pro de test (session administrateur sur `page.request`). */
async function ownedPlace(page: Page, stamp: string, sector: string, category: string): Promise<number> {
  const email = `lead-${stamp}-${category.length}@mydalil.test`
  const m = await page.request.post('/api/members', {
    data: { email, password: `Lead-${stamp}-x9`, firstName: 'Pro', lastName: 'Leads', phone: '+213550000001', termsAcceptedAt: new Date().toISOString(), _verified: true },
  })
  expect(m.ok(), 'création du propriétaire').toBe(true)
  const owner = ((await m.json()) as { doc: { id: number } }).doc.id
  const p = await page.request.post('/api/places', {
    data: { name: `${category} leads e2e ${stamp}`, sector, category, city: 'Alger', wilaya: '16', verification: 'spotted', owner, _status: 'published' },
  })
  expect(p.ok(), `fiche ${category} publiée`).toBe(true)
  return ((await p.json()) as { doc: { id: number } }).doc.id
}

const lead = (id: number, extra: Body = {}): Body => ({ collection: 'places', id, name: 'Visiteur Test', phone: '+213 550 12 34 56', message: 'Bonjour, je souhaite réserver une table.', consent: true, ...extra })

test.describe('Demandes des visiteurs', () => {
  test.beforeEach(() => test.skip(apiOnly(test.info().project.name), 'une seule passe suffit'))

  test('demande envoyée, refus sans accord, refus sur un lieu public @ecriture', async ({ page }) => {
    await ensureAdmin(page.request)
    const stamp = String(Date.now())
    const prive = await ownedPlace(page, stamp, 'restaurants-gastronomie', 'Restaurants')
    const publique = await ownedPlace(page, stamp, 'sante-soins', 'Pharmacies')
    await page.goto('/')

    // Visiteur sans compte : refusé (toute action exige un compte connecté).
    await page.context().clearCookies()
    const anonyme = await sendLead(page, lead(prive))
    expect(anonyme.status).toBe(401)

    await loginMember(page.request, `leads-${stamp}`)
    const ok = await sendLead(page, lead(prive))
    expect(ok.status, ok.error).toBe(200)

    const sansAccord = await sendLead(page, lead(prive, { consent: false }))
    expect(sansAccord.status).toBe(400)
    expect(sansAccord.error).toMatch(/accord/)

    const lieuPublic = await sendLead(page, lead(publique))
    expect(lieuPublic.status).toBe(404)
    await ensureAdmin(page.request)
    const stored = await page.request.get(`/api/leads?where[targetId][equals]=${prive}&depth=0`)
    expect(stored.ok()).toBe(true)
    const doc = ((await stored.json()) as { docs: { targetCollection: string; status: string; consent: boolean }[] }).docs[0]
    expect(doc).toMatchObject({ targetCollection: 'places', status: 'nouveau', consent: true })
    const none = await page.request.get(`/api/leads?where[targetId][equals]=${publique}&depth=0`)
    expect(((await none.json()) as { totalDocs: number }).totalDocs).toBe(0)
  })
})
