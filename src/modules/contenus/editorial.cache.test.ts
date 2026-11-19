import { describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.fn()
vi.mock('next/cache', () => ({ revalidateTag, unstable_cache: (fn: unknown) => fn }))

const { faqsFor, revalidateEditorial, EDITORIAL_TAG } = await import('./faqs')
const { currentMoments, momentBySlug } = await import('./moments')

describe('cache des contenus éditoriaux', () => {
  it('revalidateEditorial expire immédiatement l’étiquette ; sans effet hors contexte Next', () => {
    revalidateEditorial('faqs')
    revalidateEditorial('moments')
    expect(revalidateTag.mock.calls).toEqual([
      [EDITORIAL_TAG.faqs, { expire: 0 }],
      [EDITORIAL_TAG.moments, { expire: 0 }],
    ])
    revalidateTag.mockImplementationOnce(() => {
      throw new Error('hors requête')
    })
    expect(() => revalidateEditorial('faqs')).not.toThrow()
  })
  it('faqsFor : clé = chemin sans langue + langue ; une panne → aucun bloc', async () => {
    const load = vi.fn(async () => [{ id: 1, question: 'Q ?', answer: 'R.' }])
    expect(await faqsFor('/en/services/?x=1', 'en', load)).toHaveLength(1)
    expect(load).toHaveBeenCalledWith('/services', 'en')
    expect(await faqsFor('/x', 'fr', async () => Promise.reject(new Error('base')))).toEqual([])
  })
  it('moments : « en cours » calculé après le cache, langue préférée puis français', async () => {
    const now = new Date('2026-03-01T00:00:00Z')
    const list = [
      { id: 1, slug: 'ramadan', title: 'Ramadan', lang: 'fr', published: true, startsAt: '2026-02-18', endsAt: '2026-03-20' },
      { id: 2, slug: 'ramadan', title: 'Ramadan', lang: 'en', published: true, startsAt: '2026-02-18', endsAt: '2026-03-20' },
      { id: 3, slug: 'ete', title: 'Été', lang: 'fr', published: true, startsAt: '2026-06-01' },
    ]
    const load = async () => list
    expect((await currentMoments(undefined, load, now)).map((m) => m.id)).toEqual([1, 2])
    expect((await currentMoments('en', load, now)).map((m) => m.id)).toEqual([2])
    expect((await momentBySlug('ramadan', 'ar', load, now))?.id).toBe(1)
    expect(await momentBySlug('ete', 'fr', load, now)).toBeNull()
    expect(await momentBySlug('../x', 'fr', load, now)).toBeNull()
  })
})
