import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActionDef, Principal } from '@/platform/actions/types'

vi.mock('server-only', () => ({}))
vi.mock('@/platform/mail', () => ({ SITE: 'https://www.mydalil.com' }))
const counters = new Map<string, number>()
vi.mock('@/platform/security/rateLimit', () => ({
  hit: async (bucket: string, who: string, max: number) => {
    const k = `${bucket}:${who}`
    const n = (counters.get(k) ?? 0) + 1
    counters.set(k, n)
    return n > max ? 60 : 0
  },
}))
vi.mock('@/platform/controls/Controls', () => ({ getControls: async () => ({ killSwitch: 'off', telegramEnabled: true }) }))
vi.mock('@/platform/ai/vision', () => ({ readImage: async () => null }))
vi.mock('@/platform/storage/images', () => ({ cleanImage: () => ({ error: 'non testé' }) }))
vi.mock('@/platform/monitoring/errors', () => ({ recordError: async () => {} }))
vi.mock('./media', () => ({ transcriptionConfigured: () => true, transcribe: async () => 'texte' }))
const understand = vi.fn()
vi.mock('./understand', () => ({ understand: (...a: unknown[]) => understand(...a) }))
const notify = vi.fn(async (..._a: unknown[]) => {})
vi.mock('@/platform/telegram/notify', () => ({ notifyStaff: (...a: unknown[]) => notify(...a) }))

const { handleInbound } = await import('./core')
const { memorySessions, SESSION_TTL_MS } = await import('./sessions')
const { verifyFinalizeToken, finalizePhoneHash } = await import('./finalize')
const { whatsappBody } = await import('../whatsapp/webhook')
const { chatRow } = await import('../telegram/channel')
type Button = import('./core').Button

const def = (name: string): ActionDef => ({ name, title: name, description: '', module: 't', access: 'public', readOnly: true, input: { type: 'object', properties: { secteur: { type: 'string' }, wilaya: { type: 'string' }, limite: { type: 'integer' }, texte: { type: 'string' } } }, run: async () => null })
const created: Record<string, unknown>[] = []
const payload = {
  find: async () => ({ docs: [] }),
  create: async ({ data }: { data: Record<string, unknown> }) => { created.push(data); return { id: 42, ...data } },
} as never

function setup(now?: () => number) {
  const calls: { name: string; input: unknown; principal: Principal }[] = []
  const sent: { text: string; buttons?: Button[][] }[] = []
  const sessions = memorySessions(now)
  const deps = {
    actionsFor: () => [def('rechercher'), def('chercher_lieu')],
    runAction: async (name: string, input: unknown, ctx: { principal: Principal }) => {
      calls.push({ name, input, principal: ctx.principal })
      return { total: 1, resultats: [{ titre: 'Pharmacie A', ville: 'Oran', url: 'https://www.mydalil.com/adresses/a' }] }
    },
    newActionId: () => '00000000-0000-4000-8000-000000000001',
    sessions,
  }
  const out = { send: async (text: string, buttons?: Button[][]) => { sent.push({ text, buttons }) } }
  const say = (extra: Record<string, unknown>, id = '999') => handleInbound(payload, { channel: 'telegram', chatId: id, sender: { telegramId: id }, ...extra }, deps, out)
  const data = (label: string) => sent.at(-1)!.buttons!.flat().find((b) => b.text === label)?.data
  return { calls, sent, sessions, deps, say, data, last: () => sent.at(-1)! }
}

beforeEach(() => {
  process.env.REMOTE_SIGNING_SECRET = 'secret-de-test-assez-long-pour-signer-123'
  counters.clear()
  created.length = 0
  notify.mockClear()
  understand.mockReset()
})

describe('bot visiteur : menu et langue', () => {
  it('/start : message fixe + 3 boutons, FR par défaut, EN et AR selon la langue Telegram', async () => {
    const t = setup()
    await t.say({ text: '/start' })
    expect(t.last().text).toContain('Bienvenue sur DALIL')
    expect(t.last().buttons!.flat().map((b) => b.url ?? b.data)).toEqual(['v:c', 'v:i', 'https://www.mydalil.com'])
    await t.say({ text: 'hello', lang: 'en-US' })
    expect(t.last().buttons!.flat()[0].text).toBe('Find a place')
    await t.say({ text: 'سلام', lang: 'ar' })
    expect(t.last().buttons!.flat()[2].url).toBe('https://www.mydalil.com/ar')
    expect(understand).not.toHaveBeenCalled()
    expect(t.calls).toEqual([])
  })
  it('vocal, photo, document : message fixe, sans téléchargement', async () => {
    const t = setup()
    const load = vi.fn(async () => null)
    await t.say({ voice: { load } })
    await t.say({ photo: { load } })
    expect(t.sent.map((s) => s.text)).toEqual(['Les messages vocaux et les fichiers ne sont pas pris en charge. Utilisez les boutons.', 'Les messages vocaux et les fichiers ne sont pas pris en charge. Utilisez les boutons.'])
    expect(load).not.toHaveBeenCalled()
  })
  it('limites : au-delà de 10 messages par minute, un seul avis puis silence', async () => {
    const t = setup()
    for (let i = 0; i < 13; i++) await t.say({ text: 'salut' })
    expect(t.sent).toHaveLength(11)
    expect(t.last().text).toBe('Limite atteinte pour aujourd’hui. Consultez mydalil.com')
  })
  it('groupe lié au canal : lien vers la conversation privée, aucune recherche', async () => {
    const t = setup()
    await t.say({ text: '/chercher pharmacie', inGroup: true, botName: 'DalilBot' })
    expect(t.last().buttons).toEqual([[{ text: 'Discuter avec DALIL', url: 'https://t.me/DalilBot?start=chercher' }]])
    expect(t.calls).toEqual([])
  })
})

describe('parcours « Chercher »', () => {
  it('deep link /start chercher → wilaya (bouton) → rubrique → 3 fiches via chercher_lieu', async () => {
    const t = setup()
    await t.say({ text: '/start chercher' })
    expect(t.last().buttons!.flat().map((b) => b.text)).toEqual(['Alger', 'Oran', 'Sétif', 'Constantine', 'Tizi Ouzou', 'Blida', 'Autre wilaya'])
    await t.say({ callback: t.data('Oran') })
    expect(t.last().text).toContain('Oran')
    await t.say({ callback: t.data('Restaurants & Gastronomie') })
    expect(t.calls).toEqual([{ name: 'chercher_lieu', input: { secteur: 'restaurants-gastronomie', wilaya: '31', limite: 3 }, principal: { kind: 'public' } }])
    expect(t.last().text).toContain('https://www.mydalil.com/adresses/a')
    expect(t.last().buttons!.flat().map((b) => b.text)).toEqual(['Autres résultats sur le site', 'Nouvelle recherche'])
    expect(t.sessions.writes).toBe(0)
  })
  it('« Autre » : saisie validée contre le référentiel (nom, code, variante), sinon la question revient', async () => {
    const t = setup()
    await t.say({ text: '/chercher' })
    await t.say({ callback: t.data('Autre wilaya') })
    await t.say({ text: 'Gotham' })
    expect(t.last().text).toContain('Wilaya non reconnue')
    await t.say({ text: 'وهران' })
    expect(t.last().text).toContain('Oran — Quelle rubrique ?')
    expect(await t.sessions.get('telegram', '999')).toBeNull()
  })
})

describe('parcours « Inscrire mon activité »', () => {
  it('4 questions validées, brouillon serveur, équipe prévenue, lien /finaliser signé', async () => {
    const t = setup()
    await t.say({ text: '/start inscrire' })
    expect(t.last().text).toContain('Étape 1 sur 4')
    await t.say({ text: '?' })
    expect(t.last().text).toContain('Réponse non valide.\nÉtape 1 sur 4')
    expect(t.last().text).toContain('Exemple : Pharmacie Benali')
    await t.say({ text: 'Boulangerie Amrani' })
    expect(t.last().text).toContain('Étape 2 sur 4')
    await t.say({ text: 'pâtisseries' })
    expect(t.last().text).toContain('Étape 3 sur 4')
    await t.say({ text: 'oran' })
    expect(t.last().text).toContain('Étape 4 sur 4')
    await t.say({ text: '12' })
    expect(t.last().text).toContain('Exemple : 0550 12 34 56')
    await t.say({ text: '0550 12 34 56' })
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({ name: 'Boulangerie Amrani', sector: 'restaurants-gastronomie', category: 'Pâtisseries', wilaya: '31', phone: '+213550123456', _status: 'draft', verification: 'spotted' })
    expect(String(created[0].internalNote)).toContain('Déclaré via le bot Telegram')
    expect(notify).toHaveBeenCalledTimes(1)
    expect((notify.mock.calls[0][1] as { buttons: Button[][] }).buttons[0].map((b) => b.text)).toEqual(['Publier', 'Rejeter'])
    const link = /https:\/\/www\.mydalil\.com\/finaliser\?jeton=(\S+)/.exec(t.last().text)
    expect(link).not.toBeNull()
    const tok = verifyFinalizeToken(link![1])
    expect(tok).toMatchObject({ collection: 'places', id: 42, phoneHash: finalizePhoneHash('+213 550 12 34 56') })
    expect(t.calls).toEqual([])
    expect(await t.sessions.get('telegram', '999')).toBeNull()
  })
  it('activité par bouton de rubrique, wilaya par bouton', async () => {
    const t = setup()
    await t.say({ text: '/inscrire' })
    await t.say({ text: 'Clinique Ennour' })
    await t.say({ callback: t.data('Santé & Soins') ?? t.last().buttons!.flat()[2].data })
    await t.say({ callback: t.data('Alger') })
    await t.say({ text: '+33 6 12 34 56 78' })
    expect(created[0]).toMatchObject({ name: 'Clinique Ennour', wilaya: '16', phone: '+33612345678' })
  })
  it('une session expire après 30 minutes', async () => {
    let now = 1_000_000
    const t = setup(() => now)
    await t.say({ text: '/inscrire' })
    now += SESSION_TTL_MS + 1
    await t.say({ text: 'Boulangerie Amrani' })
    expect(t.last().text).toContain('Bienvenue sur DALIL')
  })
})

describe('adaptateurs', () => {
  it('WhatsApp : ≤ 3 choix = boutons « reply » (libellé court), plus = liste, liens dans le texte', () => {
    const menu = whatsappBody('Menu', [[{ text: 'Chercher un établissement', data: 'v:c', short: 'Chercher' }], [{ text: 'Inscrire', data: 'v:i' }], [{ text: 'Site', url: 'https://www.mydalil.com' }]]) as { interactive: { type: string; body: { text: string }; action: { buttons: { reply: { title: string } }[] } } }
    expect(menu.interactive.type).toBe('button')
    expect(menu.interactive.body.text).toContain('https://www.mydalil.com')
    expect(menu.interactive.action.buttons[0].reply.title).toBe('Chercher')
    const list = whatsappBody('Wilaya', Array.from({ length: 7 }, (_, i) => [{ text: `W${i}`, data: `v:cw:${i}` }])) as { interactive: { type: string; action: { sections: { rows: unknown[] }[] } } }
    expect(list.interactive.type).toBe('list')
    expect(list.interactive.action.sections[0].rows).toHaveLength(7)
  })
  it('canal : bouton « Discuter avec DALIL » seulement si TELEGRAM_BOT_USERNAME existe', () => {
    expect(chatRow({})).toEqual([])
    expect(chatRow({ TELEGRAM_BOT_USERNAME: '@DalilBot' })).toEqual([[{ text: 'Discuter avec DALIL', url: 'https://t.me/DalilBot?start=chercher' }]])
  })
})
