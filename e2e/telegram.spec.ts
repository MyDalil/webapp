import { expect, test, type APIRequestContext } from '@playwright/test'
import { ADMIN, EDITEUR, apiOnly, ensureAdmin, ensureUser, rpc, rpcId, signedButton } from './comptes'
import { signIn } from './session'

/**
 * Télécommande Telegram (src/modules/communication/remote/*, src/app/api/telegram/route.ts).
 * Sans jeton de bot en CI, les réponses ne partent pas : on prouve les effets (refus, contribution enregistrée,
 * brouillon jamais publié par un éditeur, publication par un clic signé d’un admin). Le texte de la réponse
 * n’est vérifié que si la route l’expose (champ `reponse`, voir le rapport du lot F) ; sinon le test le note.
 * Écrit en base (comptes, contributions, brouillons) → @ecriture.
 */
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const ADMIN_CHAT = 700000001
const EDITEUR_CHAT = 700000002
let updateId = Date.now() % 1_000_000_000

const send = (r: APIRequestContext, update: Record<string, unknown>, secret: string | null = SECRET ?? '') =>
  r.post('/api/telegram', { headers: secret === null ? {} : { 'x-telegram-bot-api-secret-token': secret }, data: { update_id: ++updateId, ...update } })

const message = (r: APIRequestContext, chat: number, text: string) => send(r, { message: { message_id: updateId, chat: { id: chat, type: 'private' }, from: { id: chat }, text } })

const click = (r: APIRequestContext, chat: number, data: string) =>
  send(r, { callback_query: { id: `cb-${updateId}`, from: { id: chat }, data, message: { message_id: 1, chat: { id: chat, type: 'private' }, from: { id: 1, is_bot: true }, text: 'Brouillon' } } })

/** Réponse de la télécommande si la route l’expose (mode test) ; null sinon. */
async function replyOf(res: Awaited<ReturnType<APIRequestContext['post']>>): Promise<string | null> {
  expect(res.status()).toBe(200)
  const body = (await res.json()) as { ok?: boolean; reponse?: unknown }
  expect(body.ok).toBe(true)
  if (typeof body.reponse === 'string') return body.reponse
  test.info().annotations.push({ type: 'non prouvé', description: 'texte de la réponse non exposé par /api/telegram' })
  return null
}

const placeStatus = async (r: APIRequestContext, id: number) => ((await (await r.get(`/api/places/${id}?draft=true&depth=0`)).json()) as { _status?: string })._status

test.describe('Telegram : secret du webhook', () => {
  test.beforeEach(() => test.skip(apiOnly(test.info().project.name), 'une seule passe suffit'))
  test.skip(!SECRET, 'TELEGRAM_WEBHOOK_SECRET requis')

  test('sans en-tête ou avec un faux secret : 401 ; bon secret : 200', async ({ request }) => {
    expect((await send(request, { message: { chat: { id: 1, type: 'private' }, text: '/aide' } }, null)).status()).toBe(401)
    expect((await send(request, { message: { chat: { id: 1, type: 'private' }, text: '/aide' } }, 'mauvais-secret')).status()).toBe(401)
    expect((await send(request, { message: { chat: { id: 1, type: 'private' }, text: '/aide' } }, `${SECRET}x`)).status()).toBe(401)
    const ok = await send(request, {})
    expect(ok.status()).toBe(200)
  })
})

test.describe.serial('Telegram : télécommande @ecriture', () => {
  test.skip(!SECRET, 'TELEGRAM_WEBHOOK_SECRET requis')
  let draftId = 0

  test.beforeAll(async ({ playwright, baseURL }) => {
    const r = await playwright.request.newContext({ baseURL })
    await ensureAdmin(r)
    await ensureUser(r, ADMIN, { telegramId: String(ADMIN_CHAT) })
    await ensureUser(r, EDITEUR, { role: 'editor', telegramId: String(EDITEUR_CHAT) })
    await r.dispose()
  })

  test.beforeEach(() => test.skip(apiOnly(test.info().project.name), 'une seule passe suffit'))

  // Bot public fermé (docs/canaux.md) : /start et toute autre commande → menu fixe ; /id → identifiant Telegram.
  test('visiteur : /start et /aide donnent le menu public, /id son identifiant', async ({ request }) => {
    const chat = 710000000 + (updateId % 100000)
    const start = await replyOf(await message(request, chat, '/start'))
    if (start !== null) {
      expect(start).toContain('Bienvenue sur DALIL')
      expect(start).not.toContain(String(chat))
      expect(start).not.toMatch(/\/publier|\/brouillon/)
    }
    const id = await replyOf(await message(request, chat, '/id'))
    if (id !== null) expect(id).toContain(String(chat))
    const aide = await replyOf(await message(request, chat, '/aide'))
    if (aide !== null) {
      expect(aide).toContain('Bienvenue sur DALIL')
      expect(aide).not.toMatch(/\/publier|\/brouillon/)
    }
  })

  test('visiteur : /chercher ouvre le parcours guidé fermé, aucune écriture possible', async ({ request }) => {
    await ensureAdmin(request)
    const chat = 720000000 + (updateId % 100000)
    // Bot public fermé (docs/canaux.md) : /chercher lance le parcours guidé, première étape = la wilaya.
    const found = await replyOf(await message(request, chat, '/chercher pharmacie Alger'))
    if (found !== null) expect(found).toMatch(/wilaya/i)
    // Commande d’équipe tentée par un visiteur : jamais exécutée, aucun brouillon créé.
    const nom = `Intrus Telegram ${Date.now()}`
    const refused = await replyOf(await message(request, chat, `/brouillon ${nom}`))
    if (refused !== null) expect(refused).not.toMatch(/Brouillon :/)
    const drafts = await (await request.get(`/api/places?where[name][equals]=${encodeURIComponent(nom)}&draft=true&limit=1`)).json()
    expect(drafts.totalDocs).toBe(0)
  })

  test('visiteur : un texte libre « Ajoutez … » ne crée ni fiche ni contribution, le menu est proposé', async ({ request }) => {
    const chat = 730000000 + (updateId % 100000)
    const text = `Ajoutez la pharmacie E2E ${Date.now()}, rue Didouche Mourad, Alger`
    const reply = await replyOf(await message(request, chat, text))
    // Bot fermé : pas d’IA ni de saisie libre pour un visiteur ; l’ajout passe par « Inscrire mon activité ».
    if (reply !== null) expect(reply).toMatch(/Choisissez une option|wilaya|Étape/)
    await ensureAdmin(request)
    const subs = await (await request.get(`/api/submissions?where[subject][equals]=${encodeURIComponent(text.slice(0, 120))}&limit=1&depth=0`)).json()
    expect(subs.totalDocs).toBe(0)
    const places = await (await request.get(`/api/places?where[name][contains]=${encodeURIComponent('pharmacie E2E')}&draft=true&limit=1`)).json()
    expect(places.totalDocs).toBe(0)
  })

  test('/etat : état du site pour un compte admin, refus pour un visiteur', async ({ request }) => {
    const exposed = process.env.DALIL_TEST_REMOTE === '1'
    const admin = await replyOf(await message(request, ADMIN_CHAT, '/etat'))
    if (exposed) expect(admin, 'DALIL_TEST_REMOTE=1 : la route doit exposer la réponse').not.toBeNull()
    if (admin !== null) {
      expect(admin).toContain('Arrêt général')
      expect(admin).toContain('Dernière sauvegarde')
    }
    const chat = 730000000 + (updateId % 100000)
    const visitor = await replyOf(await message(request, chat, '/etat'))
    if (exposed) expect(visitor).not.toBeNull()
    if (visitor !== null) {
      expect(visitor).toMatch(/réservée à l’équipe/)
      expect(visitor).not.toContain('Arrêt général')
    }
  })

  test('compte équipe : brouillon, puis clic Publier refusé pour un éditeur', async ({ request }) => {
    await ensureAdmin(request)
    // Brouillon créé par la même action que la télécommande (creer_brouillon_lieu), ici par la clé MCP de test ;
    // sans IA en CI, la télécommande ne peut pas remplir les champs requis depuis un texte libre.
    const key = process.env.E2E_MCP_KEY
    if (key) {
      const res = await rpc(request, '/api/mcp/admin', { jsonrpc: '2.0', id: rpcId(), method: 'tools/call', params: { name: 'creer_brouillon_lieu', arguments: { nom: `Pharmacie Telegram ${Date.now()}`, secteur: 'sante-soins', categorie: 'Pharmacies', ville: 'Alger', wilaya: '16', source: 'test e2e' } } }, key)
      const out = (await res.json()).result
      expect(out.isError).toBe(false)
      draftId = out.structuredContent.id
    } else {
      const res = await request.post('/api/places?draft=true', { data: { name: `Pharmacie Telegram ${Date.now()}`, sector: 'sante-soins', category: 'Pharmacies', city: 'Alger', wilaya: '16', verification: 'spotted', _status: 'draft' } })
      expect(res.ok(), 'brouillon créé').toBe(true)
      draftId = (await res.json()).doc.id
    }
    expect(await placeStatus(request, draftId)).toBe('draft')

    // L’éditeur demande /publier : réponse sans effet ; il clique un bouton Publier signé : refusé.
    await replyOf(await message(request, EDITEUR_CHAT, `/publier places-${draftId}`))
    const button = signedButton('p', `places-${draftId}`)
    expect(button, 'REMOTE_SIGNING_SECRET ou PAYLOAD_SECRET requis').toBeTruthy()
    const editorClick = await replyOf(await click(request, EDITEUR_CHAT, button!))
    if (editorClick !== null) expect(editorClick).toMatch(/réservée aux comptes patron et admin/)
    await signIn(request, ADMIN)
    expect(await placeStatus(request, draftId)).toBe('draft')
  })

  test('bouton falsifié refusé, même pour un admin', async ({ request }) => {
    test.skip(!draftId, 'brouillon du test précédent requis')
    const forged = `p.places-${draftId}.AAAAAAAAAAAAAAAA`
    const res = await replyOf(await click(request, ADMIN_CHAT, forged))
    if (res !== null) expect(res).toMatch(/expiré ou invalide/)
    await ensureAdmin(request)
    expect(await placeStatus(request, draftId)).toBe('draft')
  })

  test('clic Publier signé d’un admin : la fiche est publiée (le chemin du clic fonctionne)', async ({ request }) => {
    test.skip(!draftId, 'brouillon du test précédent requis')
    const res = await replyOf(await click(request, ADMIN_CHAT, signedButton('p', `places-${draftId}`)!))
    if (res !== null) expect(res).toMatch(/Publié/)
    await ensureAdmin(request)
    await expect.poll(() => placeStatus(request, draftId), { timeout: 10_000 }).toBe('published')
  })
})
