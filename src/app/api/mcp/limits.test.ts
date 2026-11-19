import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const counters = new Map<string, number>()
vi.mock('@/platform/security/rateLimit', () => ({
  clientId: async () => 'ip:test',
  guard: async () => null,
  tooMany: (s: number) => new Response(null, { status: 429, headers: { 'retry-after': String(s) } }),
  hit: async (bucket: string, who: string, max: number) => {
    const k = `${bucket}:${who}`
    const n = (counters.get(k) ?? 0) + 1
    counters.set(k, n)
    return n > max ? 30 : 0
  },
}))
vi.mock('@/platform/i18n', () => ({ isLang: (l: unknown) => l === 'fr' }))

const { LIMITS, accountLimit, countCall } = await import('./limits')

describe('limites MCP', () => {
  it('plafonds : public relevé à 600/min par IP, admin limité par compte', () => {
    expect(LIMITS.publicPerIp).toBe(600)
    expect(LIMITS.adminPerAccount).toBeLessThan(LIMITS.adminPerIp)
  })
  it('chaque tools/call compte : au-delà du plafond, erreur d’outil lisible', async () => {
    for (let i = 0; i < 3; i++) await countCall('t', 'ip:a', 3)
    await expect(countCall('t', 'ip:a', 3)).rejects.toThrow('Trop d’appels')
  })
  it('par compte : deux comptes ont chacun leur compteur ; 429 avec CORS au-delà', async () => {
    for (let i = 0; i < LIMITS.adminPerAccount; i++) expect(await accountLimit(1)).toBeNull()
    const r = await accountLimit(1)
    expect(r?.status).toBe(429)
    expect(r?.headers.get('access-control-allow-origin')).toBe('*')
    expect(await accountLimit(2)).toBeNull()
  })
})
