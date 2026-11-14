import { describe, expect, it } from 'vitest'
import { actionId, isActionId, uuidv7 } from './uuidv7'

describe('identifiant d’action (UUIDv7)', () => {
  it('respecte le format UUID version 7, variante RFC 4122', () => {
    const id = uuidv7(Date.UTC(2026, 10, 14, 12))
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('porte l’horodatage : les identifiants se trient par date', () => {
    const a = uuidv7(Date.UTC(2026, 10, 14, 12, 0, 0))
    const b = uuidv7(Date.UTC(2026, 10, 14, 12, 0, 1))
    expect(a < b).toBe(true)
    expect(parseInt(a.replace(/-/g, '').slice(0, 12), 16)).toBe(Date.UTC(2026, 10, 14, 12, 0, 0))
  })

  it('deux identifiants à la même milliseconde diffèrent', () => {
    const t = Date.now()
    expect(uuidv7(t)).not.toBe(uuidv7(t))
  })

  it('actionId = « act_ » + UUIDv7 ; isActionId le reconnaît', () => {
    const id = actionId()
    expect(id.startsWith('act_')).toBe(true)
    expect(isActionId(id)).toBe(true)
    expect(isActionId('act_123')).toBe(false)
  })
})
