import { describe, expect, it } from 'vitest'
import { previousFromAudit } from './restoreCore'

describe('previousFromAudit', () => {
  it('réapplique les valeurs « avant »', () => {
    expect(previousFromAudit({ phone: { avant: '0550', après: '0660' }, intro: { avant: null, après: 'x' } })).toEqual({ ok: true, data: { phone: '0550', intro: null } })
  })
  it('refuse une valeur tronquée par le journal', () => {
    const r = previousFromAudit({ bio: { avant: `${'a'.repeat(300)}…`, après: 'b' } })
    expect(r.ok).toBe(false)
  })
  it('refuse sans historique', () => {
    expect(previousFromAudit(undefined).ok).toBe(false)
  })
})
