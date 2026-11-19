import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActionDef, Principal } from '@/platform/actions/types'
import { verifyCallback } from '@/platform/telegram/callback'

vi.mock('server-only', () => ({}))
vi.mock('@/platform/mail', () => ({ SITE: 'https://www.mydalil.com' }))
// Compteurs en mémoire, même contrat que rateLimit.hit : 0 si sous la limite, sinon délai d’attente.
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
const notify = vi.fn(async () => {})
vi.mock('@/platform/telegram/notify', () => ({ notifyStaff: (...a: unknown[]) => notify(...(a as [])) }))
vi.mock('./media', () => ({ transcriptionConfigured: () => false, transcribe: async () => null }))
const understand = vi.fn()
vi.mock('./understand', () => ({ understand: (...a: unknown[]) => understand(...a) }))

const { handleInbound } = await import('./core')
const { memorySessions } = await import('./sessions')
type Button = import('./core').Button

const def = (name: string, access: ActionDef['access'], readOnly: boolean): ActionDef => ({ name, title: name, description: '', module: 't', access, readOnly, input: { type: 'object', properties: { q: { type: 'string' }, collection: { type: 'string' }, id: { type: 'integer' }, motif: { type: 'string' } } }, run: async () => null })
const ACTIONS = [def('rechercher', 'public', true), def('creer_brouillon_lieu', 'staff', false), def('publier_fiche', 'admin', false), def('rejeter_fiche', 'admin', false)]

const users: Record<string, { id: number; name: string; role: string }> = { '111': { id: 1, name: 'Saïd', role: 'patron' }, '222': { id: 2, name: 'Rédac', role: 'editor' } }
const updatedAt: Record<string, string> = {}
const payload = {
  findByID: async ({ collection, id }: { collection: string; id: number }) => ({ id, updatedAt: updatedAt[`${collection}-${id}`] ?? '2020-01-01T00:00:00Z' }),
  find: async ({ where }: { where: { telegramId?: { equals: string } } }) => ({ docs: users[where.telegramId?.equals ?? ''] ? [users[where.telegramId!.equals]] : [] }) } as never

function setup() {
  const calls: { name: string; input: unknown; principal: Principal; channel: string }[] = []
  const sent: { text: string; buttons?: Button[][] }[] = []
  const deps = {
    actionsFor: (p: Principal) => (p.kind === 'public' ? ACTIONS.filter((a) => a.access === 'public') : p.role === 'patron' || p.role === 'admin' ? ACTIONS : ACTIONS.filter((a) => a.access !== 'admin')),
    runAction: async (name: string, input: unknown, ctx: { principal: Principal; channel: string }) => {
      calls.push({ name, input, principal: ctx.principal, channel: ctx.channel })
      return name === 'rechercher' ? { results: [{ title: 'Pharmacie A', path: '/a' }] } : { summary: 'ok', collection: 'places', id: 12 }
    },
    newActionId: () => '00000000-0000-4000-8000-000000000001',
    sessions: memorySessions(),
  }
  const out = { send: async (text: string, buttons?: Button[][]) => { sent.push({ text, buttons }) } }
  return { calls, sent, deps, out }
}
const msg = (telegramId: string, extra: Record<string, unknown>) => ({ channel: 'telegram' as const, chatId: telegramId, sender: { telegramId }, ...extra })

beforeEach(() => {
  process.env.REMOTE_SIGNING_SECRET = 'test'
  counters.clear()
  for (const k of Object.keys(updatedAt)) delete updatedAt[k]
  notify.mockClear()
  understand.mockReset()
})

describe('routage public / équipe', () => {
  it('visiteur : texte libre = menu fixe à 3 boutons, sans action ni IA', async () => {
    const t = setup()
    await handleInbound(payload, msg('999', { text: 'pharmacie Oran' }), t.deps, t.out)
    expect(t.calls).toEqual([])
    expect(understand).not.toHaveBeenCalled()
    expect(t.sent[0].buttons?.flat().map((b) => b.text)).toEqual(['Chercher un établissement', 'Inscrire mon activité', 'Ouvrir mydalil.com'])
  })
  it('visiteur : /brouillon et « ajoutez … » ne créent rien ; /id donne l’identifiant', async () => {
    const t = setup()
    await handleInbound(payload, msg('999', { text: '/brouillon test' }), t.deps, t.out)
    await handleInbound(payload, msg('999', { text: 'Ajoutez la pharmacie Benali, Oran' }), t.deps, t.out)
    await handleInbound(payload, msg('999', { text: '/id' }), t.deps, t.out)
    expect(t.calls).toEqual([])
    expect(t.sent[2].text).toContain('999')
  })
  it('groupe : même Saïd est en lecture seule', async () => {
    const t = setup()
    await handleInbound(payload, msg('111', { text: '/brouillon pharmacie', inGroup: true }), t.deps, t.out)
    expect(t.calls).toEqual([])
  })
  it('équipe : écriture = brouillon (canal telegram) + boutons signés ; Publier seulement pour patron/admin', async () => {
    const t = setup()
    await handleInbound(payload, msg('111', { text: '/brouillon Pharmacie X Oran' }), t.deps, t.out)
    expect(t.calls[0]).toMatchObject({ name: 'creer_brouillon_lieu', channel: 'telegram', principal: { kind: 'staff', role: 'patron' } })
    expect(t.sent[0].buttons?.[0].map((b) => b.text)).toEqual(['Publier', 'Corriger', 'Rejeter'])
    expect(verifyCallback(t.sent[0].buttons![0][0].data)).toEqual({ op: 'p', ref: 'places-12' })
    const e = setup()
    await handleInbound(payload, msg('222', { text: '/brouillon Pharmacie X Oran' }), e.deps, e.out)
    expect(e.sent[0].buttons?.[0].map((b) => b.text)).toEqual(['Corriger', 'Rejeter'])
  })
  it('clic Publier : patron oui, éditeur non, donnée falsifiée non', async () => {
    const t = setup()
    await handleInbound(payload, msg('111', { text: '/brouillon X' }), t.deps, t.out)
    const data = t.sent[0].buttons![0][0].data!
    await handleInbound(payload, msg('111', { callback: data }), t.deps, t.out)
    expect(t.calls[1]).toMatchObject({ name: 'publier_fiche', input: { collection: 'places', id: 12 } })
    await handleInbound(payload, msg('222', { callback: data }), t.deps, t.out)
    await handleInbound(payload, msg('111', { callback: data.slice(0, -2) + 'xx' }), t.deps, t.out)
    expect(t.calls).toHaveLength(2)
  })
  it('équipe : langage naturel → action choisie par l’IA ; IA indisponible → commandes seulement', async () => {
    const t = setup()
    understand.mockResolvedValueOnce({ action: 'rechercher', input: { q: 'dentiste' } })
    await handleInbound(payload, msg('111', { text: 'trouve-moi un dentiste' }), t.deps, t.out)
    expect(t.calls[0]).toMatchObject({ name: 'rechercher', input: { q: 'dentiste' } })
    understand.mockResolvedValueOnce(null)
    await handleInbound(payload, msg('111', { text: 'trouve-moi un dentiste' }), t.deps, t.out)
    expect(t.sent.at(-1)?.text).toContain('IA indisponible')
  })
  it('vocal sans OPENAI_API_KEY : message clair', async () => {
    const t = setup()
    await handleInbound(payload, msg('111', { voice: { load: async () => null } }), t.deps, t.out)
    expect(t.sent[0].text).toBe('Vocal non disponible, écrivez votre message.')
  })
})

describe('confirmation des actions d’administration', () => {
  it('référence de confirmation : aller-retour, refus des entrées douteuses', async () => {
    const { confirmRef, readConfirmRef } = await import('./core')
    expect(confirmRef('envoyer_newsletter', { id: 12 })).toBe('n-12')
    expect(confirmRef('restaurer', { collection: 'places', id: 7 })).toBe('s-places-7')
    expect(readConfirmRef('s-places-7')).toEqual({ name: 'restaurer', input: { id: 7, collection: 'places', confirmer: true } })
    expect(confirmRef('creer_brouillon_lieu', { id: 1 })).toBeNull()
    expect(confirmRef('publier_fiche', { id: 'x' })).toBeNull()
    expect(readConfirmRef('z-1')).toBeNull()
    expect(confirmRef('activer_abonnement', { id: 4 })).toBe('a-4')
    expect(readConfirmRef('u-4')).toEqual({ name: 'refuser_abonnement', input: { id: 4, confirmer: true } })
    expect(confirmRef('decider_revendication', { id: 9, decision: 'acceptee' })).toBe('d-ok-9')
    expect(confirmRef('decider_revendication', { id: 9 })).toBeNull()
    expect(readConfirmRef('d-no-9')).toEqual({ name: 'decider_revendication', input: { id: 9, decision: 'refusee', confirmer: true } })
    expect(readConfirmRef('d-oui-9')).toBeNull()
    expect(readConfirmRef('v-3')).toEqual({ name: 'valider_paiement', input: { id: 3, confirmer: true } })
  })
})

describe('boutons signés : expiration, usage unique, fiche modifiée', () => {
  afterEach(() => vi.useRealTimers())
  it('un bouton ne sert qu’une fois', async () => {
    const t = setup()
    await handleInbound(payload, msg('111', { text: '/brouillon X' }), t.deps, t.out)
    const data = t.sent[0].buttons![0][0].data!
    await handleInbound(payload, msg('111', { callback: data }), t.deps, t.out)
    await handleInbound(payload, msg('111', { callback: data }), t.deps, t.out)
    expect(t.calls.filter((c) => c.name === 'publier_fiche')).toHaveLength(1)
    expect(t.sent.at(-1)?.text).toBe('Déjà utilisé.')
  })
  it('bouton de plus de 7 jours : « Bouton expiré. »', async () => {
    const t = setup()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-01T10:00:00Z'))
    await handleInbound(payload, msg('111', { text: '/brouillon X' }), t.deps, t.out)
    const data = t.sent[0].buttons![0][0].data!
    vi.setSystemTime(new Date('2026-11-09T10:00:00Z'))
    await handleInbound(payload, msg('111', { callback: data }), t.deps, t.out)
    expect(t.sent.at(-1)?.text).toBe('Bouton expiré.')
    expect(t.calls.filter((c) => c.name === 'publier_fiche')).toHaveLength(0)
  })
  it('fiche modifiée après l’émission du bouton : publication refusée', async () => {
    const t = setup()
    await handleInbound(payload, msg('111', { text: '/brouillon X' }), t.deps, t.out)
    const data = t.sent[0].buttons![0][0].data!
    updatedAt['places-12'] = new Date(Date.now() + 60_000).toISOString()
    await handleInbound(payload, msg('111', { callback: data }), t.deps, t.out)
    expect(t.sent.at(-1)?.text).toBe('Fiche modifiée depuis : rouvrez-la.')
    expect(t.calls.filter((c) => c.name === 'publier_fiche')).toHaveLength(0)
  })
  it('panne imprévue : « Erreur, réessayez. » à l’expéditeur, erreur remontée à la route', async () => {
    const t = setup()
    const broken = { ...t.deps, actionsFor: () => { throw new Error('base indisponible') } }
    await expect(handleInbound(payload, msg('111', { text: '/chercher x' }), broken, t.out)).rejects.toThrow('base indisponible')
    expect(t.sent.at(-1)?.text).toBe('Erreur, réessayez.')
  })
})

describe('arrêt général par la télécommande', () => {
  const ARRET = [def('etat_du_site', 'staff', true), { ...def('arreter_le_site', 'admin', false), input: { type: 'object', properties: { raison: { type: 'string' }, mode: { type: 'string' } } } }, { ...def('relancer_le_site', 'admin', false), input: { type: 'object', properties: {} } }]
  const withArret = () => {
    const t = setup()
    t.deps.actionsFor = (p: Principal) => (p.kind === 'public' ? [] : p.role === 'patron' || p.role === 'admin' ? ARRET : ARRET.filter((a) => a.access !== 'admin'))
    const confirmed: boolean[] = []
    const run = t.deps.runAction
    t.deps.runAction = async (name, input, ctx) => { confirmed.push(Boolean((ctx as { confirmed?: boolean }).confirmed)); return run(name, input, ctx) }
    return { ...t, confirmed }
  }
  it('/etat : lecture directe pour l’équipe', async () => {
    const t = withArret()
    await handleInbound(payload, msg('222', { text: '/etat' }), t.deps, t.out)
    expect(t.calls[0]).toMatchObject({ name: 'etat_du_site' })
  })
  it('/finir et /relancer : bouton Confirmer signé, puis exécution confirmée au clic (patron seulement)', async () => {
    const t = withArret()
    await handleInbound(payload, msg('111', { text: '/finir maintenance base' }), t.deps, t.out)
    expect(t.calls).toHaveLength(0)
    expect(t.sent[0].text).toContain('h-drain')
    await handleInbound(payload, msg('111', { callback: t.sent[0].buttons![0][0].data }), t.deps, t.out)
    expect(t.calls[0]).toMatchObject({ name: 'arreter_le_site', input: { mode: 'drain' } })
    expect(t.confirmed).toEqual([true])
    await handleInbound(payload, msg('111', { text: '/relancer' }), t.deps, t.out)
    await handleInbound(payload, msg('111', { callback: t.sent.at(-1)!.buttons![0][0].data }), t.deps, t.out)
    expect(t.calls[1]).toMatchObject({ name: 'relancer_le_site', input: {} })
    // Éditeur : ni /finir ni /relancer.
    await handleInbound(payload, msg('222', { text: '/finir' }), t.deps, t.out)
    expect(t.sent.at(-1)?.text).toContain('indisponible')
  })
  it('références sans numéro : aller-retour et refus des modes non prévus', async () => {
    const { confirmRef, readConfirmRef } = await import('./core')
    expect(confirmRef('arreter_le_site', {})).toBe('h-drain')
    expect(confirmRef('arreter_le_site', { mode: 'stop' })).toBe('h-stop')
    expect(confirmRef('arreter_le_site', { mode: 'cut' })).toBeNull()
    expect(confirmRef('relancer_le_site', {})).toBe('l')
    expect(readConfirmRef('h-cut')).toBeNull()
    expect(readConfirmRef('l')).toEqual({ name: 'relancer_le_site', input: { confirmer: true } })
    expect(readConfirmRef('h-12')).toBeNull()
  })
})
