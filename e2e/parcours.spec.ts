import { expect, test, type Page } from '@playwright/test'

/** Erreurs JavaScript de la page : un parcours essentiel n’en tolère aucune. */
const watchErrors = (page: Page) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

test.describe('Pages publiques', () => {
  for (const path of ['/', '/annuaire', '/guides', '/que-faire-ce-week-end', '/annonces', '/services', '/praticiens', '/proposer', '/label']) {
    test(`${path} s’affiche sans erreur`, async ({ page }) => {
      const errors = watchErrors(page)
      const res = await page.goto(path)
      expect(res?.status()).toBe(200)
      await expect(page.locator('h1').first()).toBeVisible()
      expect(errors).toEqual([])
    })
  }

  test('page inconnue : 404', async ({ page }) => {
    const res = await page.goto('/page-qui-n-existe-pas')
    expect(res?.status()).toBe(404)
  })
})

test.describe('Annuaire', () => {
  test('de l’annuaire à une fiche adresse', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/annuaire')
    const first = page.locator('a[href^="/adresses/"]').first()
    await expect(first).toBeVisible()
    const href = await first.getAttribute('href')
    await page.goto(href!)
    await expect(page).toHaveURL(new RegExp(`${href}$`))
    await expect(page.locator('h1').first()).not.toBeEmpty()
    expect(errors).toEqual([])
  })

  test('une fiche importée affiche son statut « à vérifier »', async ({ page }) => {
    await page.goto('/adresses/darna-said-hamdine')
    await expect(page.locator('h1').first()).toContainText('Darna')
    await expect(page.getByText(/à vérifier/i).first()).toBeVisible()
  })
})

// @ecriture : ces tests écrivent en base ; exclus des contrôles sur un déploiement (`--grep-invert @ecriture`).
test.describe('Formulaires @ecriture', () => {
  test('proposer une adresse : contribution enregistrée', async ({ page }) => {
    await page.goto('/proposer')
    const form = page.locator('form:has(input[name="title"])')
    await form.locator('select[name="contributionType"]').selectOption('adresse')
    await form.locator('input[name="title"]').fill('Test e2e — boulangerie du marché')
    await form.locator('select[name="wilaya"]').selectOption({ index: 1 })
    await form.locator('input[name="email"]').fill('e2e@example.com')
    await form.locator('[name="description"]').fill('Contribution automatique de la CI, à ignorer : vérifie l’envoi du formulaire.')
    await form.getByRole('button', { name: 'Envoyer à DALIL' }).click()
    await expect(form.locator('.form-success')).toContainText('Merci')
  })

  test('newsletter : inscription acceptée', async ({ page }) => {
    await page.goto('/')
    const form = page.locator('form.newsletter').first()
    await form.locator('input[name="email"]').fill(`e2e-${Date.now()}-${test.info().project.name}@example.com`)
    await form.getByRole('button', { name: 'S’inscrire' }).click()
    await expect(form.locator('.form-success')).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Administration', () => {
  test('/admin affiche la connexion', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 20_000 })
  })
})

test.describe('Anti-robot @ecriture', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit'))

  test('un envoi sans preuve de travail est refusé', async ({ request }) => {
    const res = await request.post('/api/subscribers', { data: { email: 'robot@example.com' } })
    expect(res.status()).toBe(403)
  })

  test('une preuve ne sert qu’une fois', async ({ page }) => {
    await page.goto('/')
    const statuses = await page.evaluate(async () => {
      const { salt, bits, sig } = await (await fetch('/api/preuve')).json()
      const enc = new TextEncoder()
      const zero = (b: Uint8Array) => {
        let n = 0
        for (const x of b) {
          if (x === 0) { n += 8; continue }
          return n + Math.clz32(x) - 24
        }
        return n
      }
      let i = 0
      while (zero(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(`${salt}:${i}`)))) < bits) i++
      const headers = { 'content-type': 'application/json', 'x-dalil-preuve': JSON.stringify({ salt, bits, sig, nonce: String(i) }) }
      const send = () => fetch('/api/subscribers', { method: 'POST', headers, body: JSON.stringify({ email: `once-${Date.now()}@example.com` }) }).then((r) => r.status)
      return [await send(), await send()]
    })
    expect(statuses).toEqual([200, 403])
  })
})
