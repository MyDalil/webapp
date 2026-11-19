import { expect, test, type Page } from '@playwright/test'
import { signIn } from './session'

const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }

/**
 * Parcours pro (lot L1) : inscription d’un établissement en brouillon, puis demande d’abonnement « en attente ».
 * Nécessite le schéma du lot K (Places.owner, subscriptions, global pricing). Le membre de test est créé par l’équipe.
 */
async function member(page: Page, tag: string) {
  await page.request.post('/api/users/first-register', { data: ADMIN })
  await signIn(page.request, ADMIN)
  const stamp = `${Date.now()}-${tag}`
  const email = `pro-${stamp}@mydalil.test`
  const password = `Pro-${stamp}-x9`
  const created = await page.request.post('/api/members', {
    data: { email, password, firstName: 'Pro', lastName: 'Test', phone: '+213550000000', termsAcceptedAt: new Date().toISOString(), _verified: true },
  })
  expect(created.ok(), 'création du membre de test').toBe(true)
  expect((await page.request.post('/api/members/login', { data: { email, password } })).ok(), 'connexion du membre').toBe(true)
  return stamp
}

test.describe('Parcours professionnel', () => {
  test('inscription d’un établissement puis abonnement en attente de validation @ecriture', async ({ page }, info) => {
    const stamp = await member(page, `pro-${info.project.name}`)

    await page.goto('/inscrire')
    await page.getByRole('button', { name: /Autre établissement/ }).click()
    await page.locator('select[name="wilaya"]').selectOption('16')
    await page.locator('select[name="sector"]').selectOption({ index: 1 })
    await page.locator('select[name="category"]').selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Continuer' }).click()
    await page.locator('input[name="name"]').fill(`Établissement e2e ${stamp}`)
    await page.locator('input[name="city"]').fill('Alger')
    await page.getByRole('button', { name: 'Enregistrer en brouillon' }).click()
    await expect(page.getByText(/brouillon/).first()).toBeVisible()

    // Jamais publié : la fiche n’est pas lisible publiquement.
    const pub = await page.request.get(`/api/places?where[name][equals]=${encodeURIComponent(`Établissement e2e ${stamp}`)}&depth=0`)
    expect(((await pub.json()) as { docs?: unknown[] }).docs ?? []).toHaveLength(0)

    await page.goto('/espace-pro/abonnement')
    await expect(page.locator('select').first()).toContainText(`Établissement e2e ${stamp}`)
    // Sans tarif saisi : « Tarif sur demande » et demande sans paiement ; avec tarif : reçu BaridiMob.
    const onRequest = page.getByRole('button', { name: 'Être contacté par l’équipe' })
    if (await onRequest.isVisible()) await onRequest.click()
    else {
      await page.locator('input[name="reference"]').fill(`E2E-${stamp}`)
      await page.locator('input[name="file"]').setInputFiles({ name: 'recu.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64') })
      await page.getByRole('button', { name: 'Demander l’abonnement' }).click()
    }
    await expect(page.getByText('En attente de validation').first()).toBeVisible()
  })

  test('tarif saisi puis reçu BaridiMob joint : paiement en attente avec justificatif privé @ecriture', async ({ page }, info) => {
    // Tarif saisi par l’équipe (global `pricing`, API admin) : le parcours propose le reçu au lieu de « Tarif sur demande ».
    await page.request.post('/api/users/first-register', { data: ADMIN })
    await signIn(page.request, ADMIN)
    const priced = await page.request.post('/api/globals/pricing', { data: { annualFreeMonths: 2, plans: [{ code: 'pro', label: 'Pro', monthlyDZD: 1500, monthlyEUR: 12, features: [] }] } })
    expect(priced.ok(), 'tarif enregistré').toBe(true)

    const stamp = await member(page, `recu-${info.project.name}`)
    await page.goto('/inscrire')
    await page.getByRole('button', { name: /Autre établissement/ }).click()
    await page.locator('select[name="wilaya"]').selectOption('16')
    await page.locator('select[name="sector"]').selectOption({ index: 1 })
    await page.locator('select[name="category"]').selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Continuer' }).click()
    await page.locator('input[name="name"]').fill(`Établissement reçu ${stamp}`)
    await page.locator('input[name="city"]').fill('Alger')
    await page.getByRole('button', { name: 'Enregistrer en brouillon' }).click()
    await expect(page.getByText(/brouillon/).first()).toBeVisible()

    await page.goto('/espace-pro/abonnement')
    await expect(page.locator('select').first()).toContainText(`Établissement reçu ${stamp}`)
    await expect(page.getByRole('button', { name: 'Demander l’abonnement' })).toBeVisible()
    const reference = `E2E-RECU-${stamp}`
    await page.locator('input[name="reference"]').fill(reference)
    await page.locator('input[name="file"]').setInputFiles({ name: 'recu.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64') })
    await page.getByRole('button', { name: 'Demander l’abonnement' }).click()
    await expect(page.getByText('En attente de validation').first()).toBeVisible()

    // Contrôle côté équipe : paiement « en attente » relié à son justificatif privé.
    await signIn(page.request, ADMIN)
    const res = await page.request.get(`/api/payments?where[reference][equals]=${encodeURIComponent(reference)}&depth=0`)
    expect(res.ok()).toBe(true)
    const payments = ((await res.json()) as { docs?: { status?: string; proofFile?: unknown; purpose?: string }[] }).docs ?? []
    expect(payments).toHaveLength(1)
    expect(payments[0]).toMatchObject({ status: 'en_attente', purpose: 'abonnement' })
    expect(payments[0].proofFile).toBeTruthy()
  })
})
