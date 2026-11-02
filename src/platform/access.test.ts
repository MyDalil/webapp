import { describe, expect, it } from 'vitest'
import { contactField, guardPublication, isStaffField, mayPublish } from './access'

const editor = { collection: 'users', role: 'editor' }
const admin = { collection: 'users', role: 'admin' }
const patron = { collection: 'users', role: 'patron' }
const member = { collection: 'members', kind: 'particulier', email: 'a@b.dz' }
const agent = { collection: 'agents', slug: 'ceo' }
const ctx = (user: unknown, doc?: unknown) => ({ req: { user }, doc, siblingData: doc }) as never

describe('A01 — champs internes et coordonnées', () => {
  it('note interne : équipe seulement', () => {
    expect(isStaffField(ctx(null))).toBe(false)
    expect(isStaffField(ctx(member))).toBe(false)
    expect(isStaffField(ctx(agent))).toBe(false)
    expect(isStaffField(ctx(editor))).toBe(true)
  })
  it('coordonnées : visiteur seulement si showContacts', () => {
    expect(contactField(ctx(null, { showContacts: false }))).toBe(false)
    expect(contactField(ctx(null, { showContacts: true }))).toBe(true)
    expect(contactField(ctx(member, { showContacts: false }))).toBe(true)
    expect(contactField(ctx(editor, {}))).toBe(true)
  })
})

describe('A02 — le rédacteur prépare, ne publie pas', () => {
  const run = (field: '_status' | 'status', user: unknown, data: Record<string, unknown>, originalDoc?: Record<string, unknown>) =>
    () => guardPublication(field)({ data, originalDoc, req: { user } } as never)
  it('brouillon autorisé, publication refusée', () => {
    expect(run('_status', editor, { _status: 'draft' })).not.toThrow()
    expect(run('_status', editor, { _status: 'published' })).toThrow(/administrateur/)
    expect(run('_status', agent, { _status: 'published' })).toThrow()
    expect(run('_status', member, { _status: 'published' })).toThrow()
  })
  it('administrateur, patron et traitements sans compte publient', () => {
    expect(run('_status', admin, { _status: 'published' })).not.toThrow()
    expect(run('_status', patron, { _status: 'published' })).not.toThrow()
    expect(run('_status', undefined, { _status: 'published' })).not.toThrow()
    expect(mayPublish(null)).toBe(true)
  })
  it('statut : passage à « publié » refusé, fiche déjà publiée modifiable', () => {
    expect(run('status', editor, { status: 'published' }, { status: 'pending' })).toThrow()
    expect(run('status', editor, { status: 'published', bio: 'x' }, { status: 'published' })).not.toThrow()
    expect(run('status', editor, { status: 'suspended' }, { status: 'published' })).not.toThrow()
  })
})
