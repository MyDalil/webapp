import { describe, expect, it } from 'vitest'
import type { CollectionBeforeChangeHook, FieldAccess } from 'payload'
import { Users, teamNotice, touchesPatron } from './Users'

const patron = { collection: 'users', id: 1, role: 'patron', name: 'Saïd' }
const admin = { collection: 'users', id: 2, role: 'admin', name: 'Rad' }
const editor = { collection: 'users', id: 3, role: 'editor', name: 'Lina' }
const before = Users.hooks!.beforeChange![0] as CollectionBeforeChangeHook
const fakePayload = { count: async () => ({ totalDocs: 3 }) }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = (user: unknown, data: Record<string, unknown>, originalDoc?: Record<string, unknown>, operation: 'create' | 'update' = 'update') => before({ data, originalDoc, operation, req: { user, payload: fakePayload } as any, context: {} } as any)
const field = (name: string) => (Users.fields as { name?: string; access?: Record<string, FieldAccess> }[]).find((f) => f.name === name)!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fa = (fn: FieldAccess | undefined, user: unknown) => (fn as (a: any) => boolean)({ req: { user } })

describe('verrou de l’équipe', () => {
  it('création de compte et champs sensibles réservés à patron/admin', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((Users.access!.create as (a: any) => boolean)({ req: { user: editor } })).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((Users.access!.create as (a: any) => boolean)({ req: { user: admin } })).toBe(true)
    for (const name of ['role', 'telegramId', 'whatsappPhone']) {
      expect(fa(field(name).access!.update, editor)).toBe(false)
      expect(fa(field(name).access!.create, editor)).toBe(false)
      expect(fa(field(name).access!.update, admin)).toBe(true)
    }
  })
  it('un admin ne nomme jamais un patron ; un patron le peut', async () => {
    await expect(run(admin, { role: 'patron' }, { role: 'editor' })).rejects.toThrow(/patron/)
    await expect(run(admin, { role: 'admin' }, { role: 'patron' })).rejects.toThrow(/patron/)
    await expect(run(patron, { role: 'patron' }, { role: 'admin' })).resolves.toEqual({ role: 'patron' })
    expect(touchesPatron({ name: 'x' } as never, { role: 'patron' })).toBe(false)
  })
  it('un rédacteur ne change ni rôle, ni Telegram, ni WhatsApp (même sur son compte)', async () => {
    await expect(run(editor, { telegramId: '123456' }, { telegramId: null })).rejects.toThrow(/Réservé/)
    await expect(run(editor, { whatsappPhone: '+213551234567' }, { whatsappPhone: null })).rejects.toThrow(/Réservé/)
    await expect(run(editor, { name: 'Lina B.', telegramId: undefined }, { name: 'Lina', telegramId: null })).resolves.toMatchObject({ name: 'Lina B.' })
    await expect(run(admin, { telegramId: '123456' }, { telegramId: null })).resolves.toEqual({ telegramId: '123456' })
  })
  it('message à l’autre admin', () => {
    expect(teamNotice('Rad', 'create', { name: 'Nour', role: 'editor' })).toBe('Rad a créé le compte Nour (rôle : rédacteur).')
    expect(teamNotice('Rad', 'delete', { name: 'Nour' })).toBe('Rad a supprimé le compte Nour.')
    expect(teamNotice('Saïd', 'update', { name: 'Nour', role: 'admin', telegramId: '1234' }, { name: 'Nour', role: 'editor', telegramId: null })).toBe('Saïd a modifié le compte Nour : rôle rédacteur → administrateur, identifiant Telegram modifié.')
    expect(teamNotice('Saïd', 'update', { name: 'Nour B.', role: 'editor' }, { name: 'Nour', role: 'editor' })).toBeNull()
  })
})
