import { describe, expect, it, vi } from 'vitest'
import { ActionError, createRunner, type ActionAudit } from './run'
import { principalFromUser } from './context'
import { reqContextOf } from './reqContext'
import type { ActionContext, ActionDef, Principal } from './types'

const publicP: Principal = { kind: 'public' }
const editor: Principal = { kind: 'staff', userId: 2, role: 'editor', name: 'Éd' }
const admin: Principal = { kind: 'staff', userId: 1, role: 'admin', name: 'Ad' }
const conseiller: Principal = { kind: 'staff', userId: 3, role: 'conseiller', name: 'Co' }
const ctx = (principal: Principal, channel: ActionContext['channel'] = 'mcp'): ActionContext => ({ principal, channel, actionId: `act_${Math.random()}`, lang: 'fr' })

const seen: Record<string, unknown>[] = []
const def = (name: string, access: ActionDef['access'], readOnly: boolean): ActionDef => ({
  name,
  title: name,
  description: name,
  module: 'test',
  access,
  readOnly,
  input: { type: 'object', properties: { q: { type: 'string', maxLength: 10 }, _status: { type: 'string' }, status: { type: 'string' } } },
  run: async (input, c) => {
    seen.push(input)
    if (input.q === 'boom') throw new Error('panne')
    if (input.q === 'payload') delete reqContextOf(c).actionId // une ligne d’audit Payload consomme l’identifiant
    return { summary: `ok ${name}` }
  },
})
const ACTIONS = [def('lire', 'public', true), def('brouillon', 'staff', false), def('publier', 'admin', false)]

const setup = () => {
  const notify = vi.fn(async () => {})
  const audits: ActionAudit[] = []
  const run = createRunner({ actions: () => ACTIONS, notify, audit: async (a) => void audits.push(a) })
  return { run, notify, audits }
}

describe('runAction : accès', () => {
  it('action inconnue', async () => {
    await expect(setup().run('nope', {}, ctx(publicP))).rejects.toMatchObject({ code: 'not_found' })
  })
  it('public refusé sur une action équipe', async () => {
    await expect(setup().run('brouillon', {}, ctx(publicP))).rejects.toMatchObject({ code: 'forbidden' })
  })
  it('conseiller refusé sur une action équipe', async () => {
    await expect(setup().run('brouillon', {}, ctx(conseiller))).rejects.toBeInstanceOf(ActionError)
  })
  it('rédacteur refusé sur publier, admin accepté', async () => {
    const { run } = setup()
    await expect(run('publier', {}, ctx(editor))).rejects.toMatchObject({ code: 'forbidden' })
    await expect(run('publier', {}, ctx(admin, 'admin'))).resolves.toEqual({ summary: 'ok publier' })
  })
  it('canal distant : publication par un admin seulement après un clic signé', async () => {
    const { run } = setup()
    await expect(run('publier', {}, ctx(admin))).rejects.toMatchObject({ code: 'forbidden' })
    await expect(run('publier', {}, ctx(admin, 'telegram'))).rejects.toMatchObject({ code: 'forbidden' })
    await expect(run('publier', {}, { ...ctx(admin, 'telegram'), confirmed: true })).resolves.toEqual({ summary: 'ok publier' })
  })
  it('public accepté en lecture, sans notification ni audit', async () => {
    const { run, notify, audits } = setup()
    await expect(run('lire', { q: 'x' }, ctx(publicP))).resolves.toEqual({ summary: 'ok lire' })
    expect(notify).not.toHaveBeenCalled()
    expect(audits).toHaveLength(0)
  })
  it('entrée invalide refusée', async () => {
    await expect(setup().run('lire', { q: 'beaucoup trop long' }, ctx(publicP))).rejects.toMatchObject({ code: 'invalid_input' })
  })
})

describe('runAction : brouillon, notification, audit', () => {
  it('canal MCP : les champs de publication sont retirés d’une écriture non admin', async () => {
    seen.length = 0
    await setup().run('brouillon', { q: 'a', _status: 'published', status: 'published' }, ctx(editor, 'mcp'))
    expect(seen.at(-1)).toEqual({ q: 'a' })
  })
  it('canal admin : rien n’est retiré', async () => {
    seen.length = 0
    await setup().run('brouillon', { q: 'a', status: 'published' }, ctx(editor, 'admin'))
    expect(seen.at(-1)).toEqual({ q: 'a', status: 'published' })
  })
  it('écriture : équipe prévenue avant et après, audit avec l’identifiant', async () => {
    const { run, notify, audits } = setup()
    const c = ctx(editor)
    await run('brouillon', { q: 'a' }, c)
    expect(notify).toHaveBeenCalledTimes(2)
    expect(notify.mock.calls.every((x) => (x as unknown[])[1] && ((x as unknown[])[1] as { actionId: string }).actionId === c.actionId)).toBe(true)
    expect(audits[0]).toMatchObject({ ok: true, consumed: false, summary: 'ok brouillon' })
  })
  it('identifiant consommé par Payload : signalé à l’audit', async () => {
    const { run, audits } = setup()
    await run('brouillon', { q: 'payload' }, ctx(editor))
    expect(audits[0].consumed).toBe(true)
  })
  it('échec : notifié, audité, erreur relancée', async () => {
    const { run, notify, audits } = setup()
    await expect(run('brouillon', { q: 'boom' }, ctx(editor))).rejects.toMatchObject({ code: 'failed', message: expect.stringContaining('Erreur interne') })
    expect(notify).toHaveBeenCalledTimes(2)
    expect(audits[0]).toMatchObject({ ok: false, summary: 'panne' })
  })
})

describe('principalFromUser', () => {
  it('compte équipe → staff ; membre, agent ou rien → public', () => {
    expect(principalFromUser({ collection: 'users', id: 1, role: 'admin', name: 'A' })).toEqual({ kind: 'staff', userId: 1, role: 'admin', name: 'A' })
    expect(principalFromUser({ collection: 'members', id: 1 })).toEqual({ kind: 'public' })
    expect(principalFromUser({ collection: 'agents', id: 1 })).toEqual({ kind: 'public' })
    expect(principalFromUser(null)).toEqual({ kind: 'public' })
  })
})
