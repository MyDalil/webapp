import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/platform/http', () => ({ payload: async () => ({}) }))
vi.mock('@/platform/security/rateLimit', () => ({ hit: async () => 0, peek: async () => 0 }))
const recordError = vi.fn(async () => {})
vi.mock('@/platform/monitoring/errors', () => ({ recordError: (...a: unknown[]) => recordError(...(a as [])) }))

const { oauthSecret, wwwAuthenticate, resourceMetadataUrl } = await import('./server')
const { makeConfig } = await import('./core')

describe('secret OAuth', () => {
  const long = 'o'.repeat(32)
  it('production : OAUTH_SECRET dédié obligatoire (32 caractères), jamais de repli sur PAYLOAD_SECRET', () => {
    expect(oauthSecret({ VERCEL_ENV: 'production', OAUTH_SECRET: long, PAYLOAD_SECRET: 'p'.repeat(40) })).toEqual({ secret: long })
    const missing = oauthSecret({ VERCEL_ENV: 'production', PAYLOAD_SECRET: 'p'.repeat(40) })
    expect(missing.secret).toBe('')
    expect(missing.error).toContain('OAUTH_SECRET')
    expect(oauthSecret({ VERCEL_ENV: 'production', OAUTH_SECRET: 'court' }).error).toBeTruthy()
  })
  it('preview et local : repli autorisé', () => {
    expect(oauthSecret({ VERCEL_ENV: 'preview', PAYLOAD_SECRET: 'payload-secret-1234' }).secret).toBe('payload-secret-1234')
    expect(oauthSecret({ DALIL_DATABASE_URL: 'postgres://x' }).secret).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('métadonnées de ressource protégée', () => {
  it('en-tête 401 : émetteur selon l’environnement, même adresse que la route .well-known', () => {
    const cfg = makeConfig('secret-de-test-assez-long-0123456789', '1', 'https://preview.mydalil.com')!
    expect(resourceMetadataUrl(cfg)).toBe('https://preview.mydalil.com/.well-known/oauth-protected-resource/api/mcp/admin')
    expect(wwwAuthenticate(cfg)).toBe(`Bearer realm="DALIL", resource_metadata="${resourceMetadataUrl(cfg)}"`)
    expect(wwwAuthenticate(null)).toBe('Bearer realm="DALIL"')
  })
})
