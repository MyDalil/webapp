import { expect, test, type Page } from '@playwright/test'
import { signIn } from './session'

const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }

/**
 * Parcours d’un membre connecté, de bout en bout. Le membre de test est créé par l’équipe (API réservée au staff) :
 * la preuve anti-robot de l’inscription publique n’est jamais contournée.
 */
/** Membre de test connecté : créé par l’équipe, puis connecté par mot de passe. */
async function member(page: Page, tag: string) {
  await page.request.post('/api/users/first-register', { data: ADMIN })
  await signIn(page.request, ADMIN)
  const stamp = `${Date.now()}-${tag}`
  const email = `parcours-${stamp}@mydalil.test`
  const password = `Parcours-${stamp}-x9`
  const created = await page.request.post('/api/members', {
    data: { email, password, firstName: 'Parcours', lastName: 'Test', phone: '+213550000000', termsAcceptedAt: new Date().toISOString(), _verified: true },
  })
  expect(created.ok(), 'création du membre de test').toBe(true)
  expect((await page.request.post('/api/members/login', { data: { email, password } })).ok(), 'connexion du membre').toBe(true)
}

test.describe('Parcours d’un membre', () => {
  test('rendez-vous : un membre réserve un créneau chez le praticien de test @ecriture', async ({ page }, info) => {
    await member(page, `rdv-${info.project.name}`)

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

  test('annonce : un membre dépose une annonce, elle part au contrôle @ecriture', async ({ page }, info) => {
    await member(page, `annonce-${info.project.name}`)
    await page.goto('/annonces/deposer')
    await page.selectOption('main select[name=category]', 'objets')
    await page.selectOption('main select[name=subcategory]', { index: 1 })
    await page.fill('main input[name=title]', `Table en bois, test ${info.project.name}`)
    await page.locator('main textarea').first().fill('Table en bois massif, bon état. Annonce de test des parcours automatiques.')
    await page.fill('main input[name=price]', '5000')
    await page.selectOption('main select[name=wilaya]', { label: 'Alger' })
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/api/annonces') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /Déposer l.annonce/ }).click(),
    ])
    expect(res.status()).toBe(201)
    await expect(page).toHaveURL(/annonce=envoyee/)
  })

  test('service : un membre envoie une demande à un prestataire @ecriture', async ({ page }, info) => {
    await member(page, `service-${info.project.name}`)
    await page.goto('/prestataires/exemple-bricolage')
    await page.locator('main button', { hasText: 'Petits travaux' }).first().click()
    // Premier jour ouvert (les jours passés ou fermés sont désactivés selon la date du test).
    await page.locator('main button.req-day:not([disabled])').nth(info.project.name === 'mobile' ? 1 : 0).click()
    await page.locator('main button:not([disabled])', { hasText: /^\d\d:\d\d$/ }).nth(info.project.name === 'mobile' ? 3 : 0).click()
    await page.selectOption('main select[name=commune]', { index: 1 })
    await page.fill('main input[name=address]', '12 rue de test, bâtiment A')
    await page.fill('main textarea[name=details]', 'Pose de deux étagères. Demande de test des parcours automatiques.')
    await page.locator('main input[type=checkbox]').last().check()
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/services') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Envoyer ma demande' }).click(),
    ])
    expect(res.ok(), `demande de service : ${res.status()}`).toBe(true)
  })

  test('professionnel : un membre envoie sa fiche de prestataire à la vérification @ecriture', async ({ page }, info) => {
    await member(page, `pro-${info.project.name}`)
    await page.goto('/espace-pro?espace=services')
    await page.fill('main input[name=displayName]', 'Parcours Test')
    await page.selectOption('main select[name=gender]', { index: 1 })
    await page.selectOption('main select[name=legalForm]', { index: 1 })
    await page.fill('main input[name=legalNumber]', 'TEST-0001')
    await page.selectOption('main select[name=wilaya]', { label: 'Alger' })
    for (const sel of await page.locator('main select:visible').all()) if (!(await sel.inputValue())) await sel.selectOption({ index: 1 })
    await page.locator('main input[type=number]:visible').first().fill('1500')
    await page.locator('main input[name=languages]').first().check()
    await page.fill('main textarea[name=bio]', 'Fiche de test des parcours automatiques. Dix ans de métier, travail soigné, déplacement à Alger.')
    await page.getByRole('button', { name: /Envoyer ma fiche/ }).click()
    await expect(page.getByRole('heading', { name: 'Vérifications' })).toBeVisible()
  })
})
