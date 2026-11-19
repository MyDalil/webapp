import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
// Fonction simple (pas vi.fn) : une erreur simulée ne doit pas être comptée par le suivi des appels de Vitest.
let impl: () => Promise<unknown> = async () => ({})
let calls = 0
const findGlobal = {
  mockResolvedValue: (v: unknown) => (impl = async () => v),
  fail: () =>
    (impl = async () => {
      throw new Error('base indisponible')
    }),
  reset: () => ((impl = async () => ({})), (calls = 0)),
}
vi.mock('@/platform/http', () => ({ payload: async () => ({ findGlobal: () => (calls++, impl()) }) }))
// Cache Next neutralisé : chaque appel relit (le test compte les lectures de base).
const cacheOpts: unknown[] = []
vi.mock('next/cache', () => ({ unstable_cache: (f: () => unknown, _k: unknown, o: unknown) => (cacheOpts.push(o), f), revalidateTag: vi.fn(), revalidatePath: vi.fn() }))

const { offSections, isSectionOff, sectionGate, CONTROLS_TAG } = await import('./offSections')

describe('lecture des interrupteurs', () => {
  beforeEach(() => findGlobal.reset())
  it('lecture en cache étiquetée « controls »', () => {
    expect(CONTROLS_TAG).toBe('controls')
    expect(cacheOpts[0]).toMatchObject({ tags: ['controls'] })
  })
  it('clés connues seulement ; rubrique coupée = ses catégories coupées', async () => {
    findGlobal.mockResolvedValue({ offSections: ['r:musulmane', 'inconnue'], offMessage: null })
    expect(await offSections()).toEqual(['r:musulmane'])
    expect(await isSectionOff('c:mosquees-priere/mosquees')).toBe(true)
    expect(await isSectionOff('c:sante-soins/pharmacies')).toBe(false)
  })
  it('message de la page coupée, selon la langue', async () => {
    findGlobal.mockResolvedValue({ offSections: ['c:mosquees-priere/mosquees'], offMessage: 'Retour lundi.' })
    expect(await sectionGate('/annuaire/mosquees-priere/mosquees', 'fr')).toBe('Retour lundi.')
    expect(await sectionGate('/annuaire/mosquees-priere/mosquees', 'en')).toBe('This section is coming back soon.')
    expect(await sectionGate('/adresses/mosquee-x', 'fr', { sector: 'mosquees-priere', category: 'Mosquées' })).toBe('Retour lundi.')
    expect(await sectionGate('/praticiens', 'fr')).toBeNull()
  })
  it('panne de lecture : rien n’est coupé', async () => {
    findGlobal.fail()
    expect(await offSections()).toEqual([])
  })
})

describe('action basculer_section', () => {
  it('refusée à un éditeur, même depuis /admin', async () => {
    findGlobal.reset()
    const { createRunner, ActionError } = await import('@/platform/actions/run')
    vi.doMock('payload', () => ({ createLocalReq: vi.fn() }))
    const { controlActions } = await import('./actions')
    const run = createRunner({ actions: () => controlActions, notify: async () => {}, audit: async () => {} })
    const ctx = { principal: { kind: 'staff' as const, userId: 2, role: 'editor' as const, name: 'Éd' }, channel: 'admin' as const, actionId: 'a1', lang: 'fr' as const }
    await expect(run('basculer_section', { cle: 'r:sante', coupe: true }, ctx)).rejects.toBeInstanceOf(ActionError)
    await expect(run('basculer_section', { cle: 'r:sante', coupe: true }, ctx)).rejects.toMatchObject({ code: 'forbidden' })
    expect(calls).toBe(0)
    const def = controlActions.find((a) => a.name === 'basculer_section')!
    expect(def).toMatchObject({ access: 'admin', readOnly: false })
  })
})
