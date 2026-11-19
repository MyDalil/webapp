import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/platform/mail', () => ({ SITE: 'https://www.mydalil.com' }))
const { finalizeLink, finalizeToken, verifyFinalizeToken, finalizePhoneHash, FINALIZE_TTL } = await import('./finalize')

beforeEach(() => {
  process.env.REMOTE_SIGNING_SECRET = 'secret-de-test-assez-long-pour-signer-123'
})

describe('lien de finalisation', () => {
  it('aller-retour : collection, id, empreinte du téléphone (jamais en clair)', () => {
    const url = finalizeLink({ collection: 'places', id: 12, phone: '0550123456' })
    expect(url.startsWith('https://www.mydalil.com/finaliser?jeton=')).toBe(true)
    expect(url).not.toContain('550123456')
    const t = verifyFinalizeToken(new URL(url).searchParams.get('jeton'))
    expect(t).toMatchObject({ collection: 'places', id: 12, phoneHash: finalizePhoneHash('+213550123456') })
    expect(finalizeLink({ collection: 'places', id: 12 }, 'ar')).toContain('/ar/finaliser?jeton=')
  })
  it('jeton altéré, autre secret ou expiré : refusé', () => {
    const now = 1_800_000_000
    const tok = finalizeToken({ collection: 'places', id: 5 }, now)!
    expect(verifyFinalizeToken(tok, now + 10)).not.toBeNull()
    expect(verifyFinalizeToken(tok, now + FINALIZE_TTL + 1)).toBeNull()
    expect(verifyFinalizeToken(`${tok.slice(0, -2)}xx`, now)).toBeNull()
    const [body, sig] = tok.split('.')
    const forged = Buffer.from(JSON.stringify({ c: 'places', i: 6, p: null, e: now + 100 })).toString('base64url')
    expect(verifyFinalizeToken(`${forged}.${sig}`, now)).toBeNull()
    expect(verifyFinalizeToken(body, now)).toBeNull()
    process.env.REMOTE_SIGNING_SECRET = 'un-autre-secret-de-test-tout-aussi-long-456'
    expect(verifyFinalizeToken(tok, now)).toBeNull()
  })
})
