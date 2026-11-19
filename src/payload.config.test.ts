import { readFileSync } from 'fs'
import { describe, expect, it, vi } from 'vitest'

// Charge la configuration Payload sans base : buildConfig ne se connecte pas, il valide et assemble seulement.
async function load(plugins: string | undefined) {
  vi.resetModules()
  if (plugins === undefined) delete process.env.DALIL_PLUGINS
  else process.env.DALIL_PLUGINS = plugins
  return (await import('./payload.config')).default
}

describe('payload.config', () => {
  it('enregistre les nouvelles collections et garde celles des agents', async () => {
    const config = await load(undefined)
    const slugs = config.collections.map((c) => c.slug)
    for (const s of ['translations', 'sponsorships', 'faqs', 'moments', 'agents', 'agent-tasks', 'agent-messages', 'agent-notifications'])
      expect(slugs).toContain(s)
    const users = config.collections.find((c) => c.slug === 'users')!
    expect(users.fields.some((f) => 'name' in f && f.name === 'whatsappPhone')).toBe(true)
    const views = config.admin.components?.views ?? {}
    expect(views.importCsv).toMatchObject({ path: '/import', Component: '@/platform/ops/admin/ImportCsv#ImportCsv' })
  }, 60_000)

  it('par défaut : ni cockpit ni équipe IA visibles, logo DALIL gardé', async () => {
    const config = await load(undefined)
    const views = config.admin.components?.views ?? {}
    expect(Object.keys(views).filter((k) => k.startsWith('cockpit'))).toEqual([])
    expect(views.dashboard).toBeUndefined()
    expect(config.admin.components?.Nav).toBeUndefined()
    expect(config.admin.components?.graphics?.Logo).toBe('@/modules/pilotage/admin/Brand#DalilLogo')
    expect(config.collections.find((c) => c.slug === 'agents')?.admin.hidden).toBe(true)
  }, 60_000)

  it('cockpit et agents branchés : 24 vues cockpit, accueil Pilotage, équipe IA visible', async () => {
    const config = await load('agents,cockpit')
    const views = config.admin.components?.views ?? {}
    expect(Object.keys(views).filter((k) => k.startsWith('cockpit'))).toHaveLength(24)
    expect(views.dashboard).toBeDefined()
    expect(config.collections.find((c) => c.slug === 'agents')?.admin.hidden).toBeFalsy()
  }, 60_000)

  it('migrations appliquées au build seulement (pas de prodMigrations au démarrage)', () => {
    const source = readFileSync(new URL('./payload.config.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/prodMigrations\s*:/)
  })
})
