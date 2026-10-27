import { expect, test, type Page } from '@playwright/test'

/** IP distincte par test d’écriture (serveur local) : les limites de débit du site ne bloquent pas les relances. */
const freshIp = () => ({ 'x-forwarded-for': `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` })

/** Erreurs JavaScript de la page : un parcours essentiel n’en tolère aucune. */
const watchErrors = (page: Page) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

test.describe('Pages publiques', () => {
  for (const path of ['/', '/annuaire', '/guides', '/que-faire-ce-week-end', '/annonces', '/services', '/praticiens', '/proposer', '/label', '/en', '/ar']) {
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

  test('fiche lieu : modèle unique, sans débordement ni case « à confirmer »', async ({ page }) => {
    await page.goto('/adresses/darna-said-hamdine')
    await expect(page.locator('.pl-id h1')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Compléter une information' })).toBeVisible()
    await expect(page.getByText(/à confirmer/i)).toHaveCount(0)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})

// @ecriture : ces tests écrivent en base ; exclus des contrôles sur un déploiement (`--grep-invert @ecriture`).
test.describe('Formulaires @ecriture', () => {
  test.beforeEach(async ({ page }) => page.setExtraHTTPHeaders(freshIp()))

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
  test.beforeEach(async ({ page }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit')
    await page.setExtraHTTPHeaders(freshIp())
  })

  test('un envoi sans preuve de travail est refusé', async ({ request }) => {
    const res = await request.post('/api/subscribers', { data: { email: 'robot@example.com' }, headers: freshIp() })
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

test.describe('Aucune catégorie vide', () => {
  for (const c of ['immobilier', 'emploi', 'vehicules', 'objets']) {
    test(`annonces ${c} : au moins une annonce`, async ({ page }) => {
      await page.goto(`/annonces/${c}`)
      await expect(page.locator('.classified-card').first()).toBeVisible()
    })
  }

  test('services : chaque catégorie montre au moins un prestataire', async ({ page }) => {
    await page.goto('/services/menage')
    await expect(page.locator('.provider-card').first()).toBeVisible()
  })

  test('praticiens : sans résultat, des établissements de santé réels', async ({ page }) => {
    await page.goto('/praticiens?specialite=orthophonie&wilaya=16')
    await expect(page.locator('.praticien-card, .health-fallback a').first()).toBeVisible()
  })
})

test.describe('Recherche', () => {
  test('« hopital » trouve de vraies adresses de santé', async ({ page }) => {
    await page.goto('/recherche?q=hopital')
    await expect(page.locator('.sr a[href^="/adresses/"]').first()).toBeVisible()
  })
})

test.describe('Recherche complète', () => {
  test('« hopital oran » : la catégorie et des hôpitaux d’Oran', async ({ page }) => {
    await page.goto('/recherche?q=hopital%20oran')
    await expect(page.locator('.sr-scroll a[href*="/annuaire/sante-soins/hopitaux"]').first()).toBeVisible()
    await expect(page.locator('.sr a[href^="/adresses/"]').first()).toBeVisible()
  })

  test('« mosquée draria » : d’abord les mosquées de Draria (quartier d’Alger)', async ({ page }) => {
    await page.goto('/recherche?q=mosqu%C3%A9e%20draria')
    await expect(page.locator('.sr-meta')).toContainText('Près de Draria')
    await expect(page.locator('.sr a[href^="/adresses/"]').first()).toContainText('Draria')
  })

  test('homonymes : choix de la wilaya proposé, puis le nom le plus proche d’abord', async ({ page }) => {
    await page.goto('/recherche?q=mosqu%C3%A9e%20bachir%20ibrahimi')
    await expect(page.locator('.sr-note + .sr-scroll a').first()).toBeVisible()
    await page.goto('/recherche?q=mosqu%C3%A9e%20cheick%20bachir%20ibrahimi%20draria')
    await expect(page.locator('.sr a[href^="/adresses/"]').first()).toContainText(/ibrahimi/i)
  })

  test('faute de frappe tolérée : « pharmasie »', async ({ page }) => {
    await page.goto('/recherche?q=pharmasie')
    await expect(page.locator('.sr-scroll a[href*="pharmacies"]').first()).toBeVisible()
  })

  test('propositions pendant la frappe', async ({ request }) => {
    const res = await request.get('/api/recherche?q=plombier')
    expect(res.status()).toBe(200)
    const { items } = (await res.json()) as { items: { type: string; url: string }[] }
    expect(items.some((i) => i.url.includes('plomberie'))).toBe(true)
  })

  test('page catégorie × wilaya référencée', async ({ page }) => {
    await page.goto('/annuaire/sante-soins/hopitaux/oran')
    await expect(page.locator('h1').first()).toContainText('Oran')
    await expect(page.locator('a[href^="/adresses/"]').first()).toBeVisible()
  })
})

test('démarche CCR : guide gratuit sourcé, accompagnement seulement s’il est ouvert', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/demarches/ccr')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Certificat de changement de résidence')
  await expect(page.getByText(/Dernière vérification/)).toBeVisible()
  await expect(page.getByText(/3 ans sans interruption/).first()).toBeVisible()
  await expect(page.locator('#source-1')).toBeVisible()
  // L’offre payante est cachée en production avant le lancement ; ailleurs, elle s’affiche avec la transparence.
  const offer = page.getByRole('link', { name: 'Pack Accompagnement Premium' })
  if (await offer.count()) {
    await expect(page.getByText(/portail d’information indépendant/)).toBeVisible()
    await offer.first().click()
    await expect(page).toHaveURL(/\/accompagnement\/ccr$/)
    await expect(page.getByRole('button', { name: /liste d’attente|Envoyer ma demande/ })).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('accompagnement : inscription sur la liste d’attente @ecriture', async ({ page, request }) => {
  const r = await request.get('/accompagnement/ccr')
  test.skip(r.status() === 404, 'offre cachée')
  await page.setExtraHTTPHeaders(freshIp())
  await page.goto('/accompagnement/ccr')
  await page.locator('.ac-form input[name=name]').fill('Test Parcours')
  await page.locator('.ac-form input[name=email]').fill('parcours@example.com')
  await page.getByRole('button', { name: /liste d’attente|Envoyer ma demande/ }).click()
  await expect(page.getByText(/C’est noté|Demande reçue/)).toBeVisible()
})
