import { describe, expect, it } from 'vitest'
import type { CollectionConfig } from 'payload'
import { BotSessions } from '@/modules/communication/collections'
import { MetricsDaily } from '@/platform/metrics/Metrics'
import { ClaimDocuments, Claims, Leads, Pricing, Subscriptions } from './collections'

const admin = { collection: 'users', id: 1, role: 'admin' }
const editor = { collection: 'users', id: 2, role: 'editor' }
const member = { collection: 'members', id: 9, kind: 'pro', email: 'a@b.c' }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (fn: unknown, user: unknown) => (fn as (a: any) => unknown)({ req: { user } })
const read = (c: CollectionConfig, user: unknown) => call(c.access!.read, user)

describe('accès des nouvelles collections : rien de privé en public', () => {
  it('abonnements, revendications, demandes : public refusé, membre limité aux siens, admin tout', () => {
    for (const c of [Subscriptions, Claims, Leads]) {
      expect(read(c, null)).toBe(false)
      expect(read(c, member)).toEqual({ member: { equals: 9 } })
      expect(read(c, admin)).toBe(true)
      expect(read(c, editor)).toBe(false)
      expect(call(c.access!.create, member)).toBe(false)
      expect(call(c.access!.update, member)).toBe(false)
    }
  })
  it('pièces de revendication : administrateur seulement, jamais public ni membre', () => {
    expect(read(ClaimDocuments, null)).toBe(false)
    expect(read(ClaimDocuments, member)).toBe(false)
    expect(read(ClaimDocuments, editor)).toBe(false)
    expect(read(ClaimDocuments, admin)).toBe(true)
    expect(call(ClaimDocuments.access!.create, admin)).toBe(false)
  })
  it('conversations du bot et statistiques : serveur seulement', () => {
    for (const k of ['read', 'create', 'update', 'delete'] as const) expect(call(BotSessions.access![k], admin)).toBe(false)
    expect(read(MetricsDaily, null)).toBe(false)
    expect(call(MetricsDaily.access!.create, admin)).toBe(false)
  })
  it('tarifs : lecture publique, écriture administrateur', () => {
    expect(call(Pricing.access!.read, null)).toBe(true)
    expect(call(Pricing.access!.update, editor)).toBe(false)
    expect(call(Pricing.access!.update, admin)).toBe(true)
  })
})
