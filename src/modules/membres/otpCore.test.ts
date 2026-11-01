import { describe, expect, it } from 'vitest'
import { checkChallenge, checkTicket, makeChallenge, makeTicket, newCode } from './otpCore'

const S = 'secret-de-test'

describe('code de connexion par email', () => {
  it('accepte le bon code et rend l’email', () => {
    const code = newCode()
    const ch = makeChallenge(S, 'a@b.dz', code)
    const r = checkChallenge(S, ch, code)
    expect(r.ok && r.email).toBe('a@b.dz')
  })
  it('refuse un mauvais code, un défi expiré, un autre secret', () => {
    const ch = makeChallenge(S, 'a@b.dz', '123456', 0)
    expect(checkChallenge(S, makeChallenge(S, 'a@b.dz', '123456'), '654321')).toEqual({ ok: false, reason: 'code' })
    expect(checkChallenge(S, ch, '123456')).toEqual({ ok: false, reason: 'expired' })
    expect(checkChallenge('autre', makeChallenge(S, 'a@b.dz', '123456'), '123456')).toEqual({ ok: false, reason: 'code' })
    expect(checkChallenge(S, 'nimporte', '12')).toEqual({ ok: false, reason: 'format' })
  })
  it('refuse un email modifié dans le défi', () => {
    const ch = makeChallenge(S, 'a@b.dz', '111111')
    const forged = `${Buffer.from(Buffer.from(ch.split('.')[0], 'base64url').toString().replace('a@b.dz', 'x@y.dz')).toString('base64url')}.${ch.split('.')[1]}`
    expect(checkChallenge(S, forged, '111111').ok).toBe(false)
  })
  it('ticket d’inscription : valable, puis expiré', () => {
    expect(checkTicket(S, makeTicket(S, 'a@b.dz'))).toBe('a@b.dz')
    expect(checkTicket(S, makeTicket(S, 'a@b.dz', 0))).toBeNull()
    expect(checkTicket('autre', makeTicket(S, 'a@b.dz'))).toBeNull()
  })
  it('codes à 6 chiffres', () => {
    for (let i = 0; i < 50; i++) expect(newCode()).toMatch(/^\d{6}$/)
  })
})
