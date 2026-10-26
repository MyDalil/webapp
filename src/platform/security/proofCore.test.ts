import { describe, expect, it } from 'vitest'
import { check, issue, leadingZeroBits, solve } from './proofCore'

const SECRET = 'test'

describe('preuve de travail anti-robot', () => {
  it('compte les bits à zéro en tête', () => {
    expect(leadingZeroBits(Buffer.from([0, 0x0f]))).toBe(12)
    expect(leadingZeroBits(Buffer.from([0x80]))).toBe(0)
    expect(leadingZeroBits(Buffer.from([0, 0]))).toBe(16)
  })

  it('accepte une preuve résolue', () => {
    expect(check(SECRET, solve(issue(SECRET, Date.now(), 8)), Date.now(), 8)).toBe('ok')
  })

  it('refuse une preuve absente, falsifiée, trop faible ou expirée', () => {
    const c = issue(SECRET, Date.now(), 8)
    const p = solve(c)
    expect(check(SECRET, null)).toBe('missing')
    expect(check('autre-secret', p, Date.now(), 8)).toBe('forged')
    expect(check(SECRET, { ...p, bits: 1 }, Date.now(), 8)).toBe('forged')
    expect(check(SECRET, p, Date.now() + 16 * 60_000, 8)).toBe('expired')
    let bad = 0
    while (check(SECRET, { ...p, nonce: `x${bad}` }, Date.now(), 8) === 'ok') bad++
    expect(check(SECRET, { ...p, nonce: `x${bad}` }, Date.now(), 8)).toBe('weak')
  })
})
