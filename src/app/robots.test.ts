import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/modules/recherche', () => ({ ROBOTS_DISALLOW: ['/admin', '/api/', '/mon-compte', '/en/mon-compte'] }))

const load = async (env?: string) => {
  vi.resetModules()
  vi.stubEnv('VERCEL_ENV', env ?? '')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
  return (await import('./robots')).default()
}

afterEach(() => vi.unstubAllEnvs())

describe('robots.txt', () => {
  it('tout est bloqué hors production', async () => {
    expect(await load('preview')).toEqual({ rules: { userAgent: '*', disallow: '/' } })
    expect(await load()).toEqual({ rules: { userAgent: '*', disallow: '/' } })
  })

  it('en production : robots IA nommés, mêmes exclusions que les autres, aspirateurs bloqués, plan du site', async () => {
    const r = await load('production')
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules]
    const all = rules.find((x) => x.userAgent === '*')!
    const ai = rules.find((x) => Array.isArray(x.userAgent) && x.userAgent.includes('GPTBot'))!
    for (const bot of ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot']) {
      expect(ai.userAgent).toContain(bot)
    }
    expect(ai.allow).toBe('/')
    expect(ai.disallow).toEqual(all.disallow)
    expect(all.disallow).toContain('/admin')
    expect(rules.find((x) => Array.isArray(x.userAgent) && x.userAgent.includes('Bytespider'))!.disallow).toBe('/')
    expect(r.sitemap).toBe('https://www.mydalil.com/sitemap.xml')
  })
})
