import { expect, test } from '@playwright/test'
import { signIn } from './session'

const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }

/**
 * Parcours d’un membre connecté, de bout en bout. Le membre de test est créé par l’équipe (API réservée au staff) :
 * la preuve anti-robot de l’inscription publique n’est jamais contournée.
 */
test.describe('Parcours d’un membre', () => {
  test('rendez-vous : un membre réserve un créneau chez le praticien de test @ecriture', async ({ page }, info) => {
    await page.request.post('/api/users/first-register', { data: ADMIN })
    await signIn(page.request, ADMIN)
    const stamp = `${Date.now()}-${info.project.name}`
    const email = `parcours-${stamp}@mydalil.test`
    const password = `Parcours-${stamp}-x9`
    const created = await page.request.post('/api/members', {
      data: { email, password, firstName: 'Parcours', lastName: 'Test', phone: '+213550000000', termsAcceptedAt: new Date().toISOString(), _verified: true },
    })
    expect(created.ok(), 'création du membre de test').toBe(true)
    expect((await page.request.post('/api/members/login', { data: { email, password } })).ok(), 'connexion du membre').toBe(true)

    await page.goto('/praticiens/demo-praticien')
    // Un créneau différent par projet : ordinateur et mobile réservent en parallèle.
    await page.locator('main button', { hasText: /^\d\d:\d\d$/ }).nth(info.project.name === 'mobile' ? 4 : 1).click()
    for (const box of await page.locator('main input[type=checkbox]').all()) await box.check()
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/api/rdv') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /Confirmer le rendez-vous/ }).click(),
    ])
    expect(res.status()).toBe(201)
    await expect(page.getByText('Rendez-vous confirmé')).toBeVisible()

    await page.goto('/mon-compte')
    await expect(page.getByText('Dr Démo').first()).toBeVisible()
  })
})
