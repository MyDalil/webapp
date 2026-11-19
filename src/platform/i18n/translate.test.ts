import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('@/platform/ai/claude', () => ({ callClaude: vi.fn(async () => ({ text: 'Home cooking.', inputTokens: 1, outputTokens: 1 })) }))
const gate = vi.fn(async () => ({ ok: true }))
vi.mock('@/platform/ai/budget', () => ({ staffAiGate: () => gate(), recordAi: vi.fn(async () => {}) }))

const { translateDoc } = await import('./translate')

const fake = () => ({
  findByID: vi.fn(async () => ({ id: 4, slug: 'le-tajine', intro: 'Cuisine maison.' })),
  find: vi.fn(async () => ({ docs: [] })),
  create: vi.fn(async () => ({})),
  update: vi.fn(async () => ({})),
})

describe('translateDoc', () => {
  it('enregistre les traductions puis rafraîchit /en et /ar de la fiche', async () => {
    revalidatePath.mockClear()
    const p = fake()
    const r = await translateDoc(p as never, 'places', 4)
    expect(r.traduits).toEqual([{ field: 'intro', lang: 'en' }, { field: 'intro', lang: 'ar' }])
    expect(p.create).toHaveBeenCalledTimes(2)
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(['/en/adresses/le-tajine', '/ar/adresses/le-tajine'])
  })
  it('plafond atteint après l’anglais : seule la page anglaise est rafraîchie', async () => {
    revalidatePath.mockClear()
    gate.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, reason: 'budget' } as never)
    const r = await translateDoc(fake() as never, 'places', 4)
    expect(r.arret).toBe('plafond-atteint')
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(['/en/adresses/le-tajine'])
  })
  it('rien de traduit : aucun rafraîchissement ; hors contexte Next : pas d’erreur', async () => {
    revalidatePath.mockClear()
    gate.mockResolvedValueOnce({ ok: false, reason: 'off' } as never)
    expect((await translateDoc(fake() as never, 'places', 4)).arret).toBe('ia-non-configuree')
    expect(revalidatePath).not.toHaveBeenCalled()
    revalidatePath.mockImplementationOnce(() => {
      throw new Error('hors requête')
    })
    await expect(translateDoc(fake() as never, 'places', 4)).resolves.toMatchObject({ traduits: [{ lang: 'en' }, { lang: 'ar' }] })
  })
})
