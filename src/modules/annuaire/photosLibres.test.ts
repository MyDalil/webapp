import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { sha256 } from '@/platform/storage/Media'
import { coverCredit, galleryOf } from './photos'
import { PHOTOS_USER_AGENT, dailyPhotosMax, importFreePhotos } from './photosLibres'

/** JPEG minimal (signature valide) ; `seed` change le contenu, donc l’empreinte. */
const jpeg = (seed: number) => Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46, 0xff, 0xda, 0x00, 0x02, seed, 0xff, 0xd9])
const commons = (file: string, w = 1920) => `https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/${file}/${w}px-${file}?utm_source=commons.wikimedia.org`
const free = (file: string) => ({ url: commons(file), author: 'Amina B.', license: 'CC BY-SA 4.0', page: `https://commons.wikimedia.org/wiki/File:${file}`, width: 4000 })

type Row = Record<string, unknown> & { id: number }
type Call = { collection: string; id?: number; data?: Record<string, unknown>; file?: { name: string; mimetype: string }; context?: Record<string, unknown>; draft?: boolean }

/** Payload simulé : `places` déjà triées par score (rôle de la requête SQL), `media` en mémoire. */
function fakePayload(places: Row[], media: Row[] = []) {
  const created: Call[] = []
  const updated: Call[] = []
  const limits: number[] = []
  const payload = {
    logger: { warn: vi.fn() },
    db: {
      drizzle: {
        execute: async (q: { queryChunks?: unknown[] }) => {
          const limit = (q.queryChunks ?? []).filter((c) => typeof c === 'number').pop() as number
          limits.push(limit)
          return { rows: places.slice(0, limit).map((p) => ({ id: p.id })) }
        },
      },
    },
    find: async ({ collection, where }: { collection: string; where: { id?: { in: number[] }; hash?: { equals: string } } }) => {
      if (collection === 'places') return { docs: places.filter((p) => where.id!.in.includes(p.id)).reverse() }
      return { docs: media.filter((m) => m.hash === where.hash!.equals).slice(0, 1) }
    },
    create: async (a: Call & { file: { data: Buffer; name: string; mimetype: string } }) => {
      const doc = { id: 100 + media.length, hash: sha256(a.file.data), ...a.data }
      media.push(doc)
      created.push(a)
      return doc
    },
    update: async (a: Call) => {
      updated.push(a)
      return { id: a.id }
    },
  }
  return { payload: payload as unknown as Payload, created, updated, limits, media }
}

const ok = (seed: number) => new Response(jpeg(seed), { status: 200, headers: { 'content-type': 'image/jpeg' } })
const quick = { pauseMs: 0 }

describe('tâche photos-libres', () => {
  it('plafond par passe : PHOTOS_IMPORT_DAILY_MAX, 60 par défaut', () => {
    expect(dailyPhotosMax(undefined)).toBe(60)
    expect(dailyPhotosMax('')).toBe(60)
    expect(dailyPhotosMax('abc')).toBe(60)
    expect(dailyPhotosMax('15')).toBe(15)
    expect(dailyPhotosMax('0')).toBe(0)
  })

  it('sélection : ordre du classement, photo de personnes et fiche déjà illustrée écartées, 1280 px demandés avec le User-Agent', async () => {
    const f = fakePayload([
      { id: 1, name: 'Timgad', slug: 'timgad-batna', externalPhotos: [free('Timgad.jpg')] },
      { id: 2, name: 'Ambassade', slug: 'ambassade', externalPhotos: [{ ...free('Visit_of_minister.jpg') }] },
      { id: 3, name: 'Déjà illustrée', slug: 'deja', photos: [7], externalPhotos: [free('Deja.jpg')] },
      { id: 4, name: 'Djémila', slug: 'djemila-setif', externalPhotos: [{ ...free('Visit_of_minister.jpg') }, free('Djemila.jpg')] },
    ])
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => ok(fetch.mock.calls.length))
    const r = await importFreePhotos(f.payload, { ...quick, fetch })
    expect(r).toEqual({ importees: 2, reutilisees: 0, ignorees: 2, erreurs: 0 })
    expect(fetch.mock.calls.map((c) => c[0])).toEqual([
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Timgad.jpg/1280px-Timgad.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Djemila.jpg/1280px-Djemila.jpg',
    ])
    expect((fetch.mock.calls[0][1]!.headers as Record<string, string>)['User-Agent']).toBe(PHOTOS_USER_AGENT)
    expect(PHOTOS_USER_AGENT).toBe('DALIL/1.0 (https://www.mydalil.com; salam@mydalil.com)')
    expect(fetch.mock.calls[0][1]!.signal).toBeInstanceOf(AbortSignal)
    // Photo en tête de `photos`, sans `_status` ni brouillon : la fiche reste publiée.
    expect(f.updated.map((u) => [u.collection, u.id, u.data])).toEqual([
      ['places', 1, { photos: [100] }],
      ['places', 4, { photos: [101] }],
    ])
    expect(f.updated.every((u) => u.draft === undefined && !('_status' in u.data!) && u.context?.skipTranslate)).toBe(true)
  })

  it('crédit et licence conservés sur la photo, sans texte alternatif demandé à l’IA, et affichés en couverture', async () => {
    const f = fakePayload([{ id: 1, name: 'Timgad', slug: 'timgad-batna', externalPhotos: [free('Timgad.jpg')] }])
    await importFreePhotos(f.payload, { ...quick, fetch: async () => ok(1) })
    expect(f.created).toHaveLength(1)
    expect(f.created[0].data).toEqual({ alt: 'Timgad', moderation: 'ok', credit: 'Amina B.', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Timgad.jpg' })
    expect(f.created[0].context?.altGenerated).toBe(true)
    expect(f.created[0].file).toMatchObject({ mimetype: 'image/jpeg', name: expect.stringMatching(/^timgad-batna-[0-9a-f]{8}\.jpg$/) })
    // Affichage : la fiche servie par la photo copiée garde auteur, licence et lien vers la page source.
    const place = { name: 'Timgad', category: 'Sites archéologiques', photos: [{ ...f.media[0], url: '/media/timgad.jpg', thumbhash: 'abc' }], externalPhotos: [free('Timgad.jpg')] } as never
    expect(coverCredit(place)).toEqual({ text: 'Photo : Amina B. · CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:Timgad.jpg' })
    expect(galleryOf(place)).toEqual([{ url: '/media/timgad.jpg', alt: 'Timgad', credit: 'Amina B. · CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:Timgad.jpg', thumbhash: 'abc' }])
  })

  it('photo DALIL sans licence : pas de crédit en couverture (inchangé)', () => {
    const place = { name: 'Café', category: 'Cafés', photos: [{ id: 1, alt: 'Terrasse', url: '/media/a.jpg', credit: 'DALIL' }] } as never
    expect(coverCredit(place)).toBeNull()
    expect(galleryOf(place)[0]).toMatchObject({ credit: 'DALIL', href: null })
  })

  it('doublon : la photo de même empreinte est réutilisée, son crédit manquant est posé', async () => {
    const f = fakePayload(
      [
        { id: 1, name: 'Timgad', slug: 'timgad', externalPhotos: [free('Timgad.jpg')] },
        { id: 2, name: 'Arc de Trajan', slug: 'arc', externalPhotos: [free('Timgad.jpg')] },
      ],
      [{ id: 55, hash: sha256(jpeg(9)) }],
    )
    const r = await importFreePhotos(f.payload, { ...quick, fetch: async () => ok(9) })
    expect(r).toEqual({ importees: 0, reutilisees: 2, ignorees: 0, erreurs: 0 })
    expect(f.created).toHaveLength(0)
    expect(f.updated.filter((u) => u.collection === 'media')[0]).toMatchObject({ id: 55, data: { credit: 'Amina B.', license: 'CC BY-SA 4.0' } })
    expect(f.updated.filter((u) => u.collection === 'places').map((u) => u.data)).toEqual([{ photos: [55] }, { photos: [55] }])
  })

  it.each([429, 503])('réponse %i : arrêt propre de la passe, rien d’autre n’est appelé', async (status) => {
    const f = fakePayload([1, 2, 3].map((id) => ({ id, name: `Lieu ${id}`, slug: `lieu-${id}`, externalPhotos: [free(`L${id}.jpg`)] })))
    const fetch = vi.fn(async () => (fetch.mock.calls.length === 2 ? new Response('', { status }) : ok(fetch.mock.calls.length)))
    const r = await importFreePhotos(f.payload, { ...quick, fetch })
    expect(r).toEqual({ importees: 1, reutilisees: 0, ignorees: 0, erreurs: 0, arret: 'limite-de-la-source' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('erreur sur une image : journalisée, la passe continue ; photo introuvable, hors source ou non-image : ignorée', async () => {
    const f = fakePayload([
      { id: 1, name: 'Panne', slug: 'panne', externalPhotos: [free('Panne.jpg')] },
      { id: 2, name: 'Disparue', slug: 'disparue', externalPhotos: [free('Disparue.jpg')] },
      { id: 3, name: 'Ailleurs', slug: 'ailleurs', externalPhotos: [{ ...free('X.jpg'), url: 'https://exemple.org/960px-X.jpg' }] },
      { id: 4, name: 'Page HTML', slug: 'html', externalPhotos: [free('Html.jpg')] },
      { id: 5, name: 'Bonne', slug: 'bonne', externalPhotos: [free('Bonne.jpg')] },
    ])
    const fetch = vi.fn(async (url: string) => {
      if (url.includes('Panne')) throw new Error('délai dépassé')
      if (url.includes('Disparue')) return new Response('', { status: 404 })
      if (url.includes('Html')) return new Response('<html>', { status: 200 })
      return ok(5)
    })
    const r = await importFreePhotos(f.payload, { ...quick, fetch })
    expect(r).toEqual({ importees: 1, reutilisees: 0, ignorees: 3, erreurs: 1 })
    expect(fetch.mock.calls.some((c) => c[0].includes('exemple.org'))).toBe(false)
    expect((f.payload.logger.warn as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(4)
  })

  it('plafond de la passe et budget de temps', async () => {
    const places = Array.from({ length: 10 }, (_, k) => ({ id: k + 1, name: `Lieu ${k + 1}`, slug: `lieu-${k + 1}`, externalPhotos: [free(`L${k + 1}.jpg`)] }))
    const f = fakePayload(places)
    const fetch = vi.fn(async () => ok(fetch.mock.calls.length))
    expect(await importFreePhotos(f.payload, { ...quick, fetch, max: 3 })).toEqual({ importees: 3, reutilisees: 0, ignorees: 0, erreurs: 0, arret: 'plafond-de-la-passe' })
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(f.limits).toEqual([6])
    // Plafond à zéro : la tâche est coupée, aucune lecture.
    const off = fakePayload(places)
    expect(await importFreePhotos(off.payload, { ...quick, fetch, max: 0 })).toEqual({ importees: 0, reutilisees: 0, ignorees: 0, erreurs: 0 })
    expect(off.limits).toEqual([])
    // Budget de temps : l’horloge avance de 25 s par lecture, la passe s’arrête après 60 s.
    let t = 0
    const slow = fakePayload(places)
    const r = await importFreePhotos(slow.payload, { ...quick, fetch: async () => ok(++t), budgetMs: 60_000, now: () => (t += 25_000) })
    expect(r.arret).toBe('temps-ecoule')
    expect(r.importees).toBeLessThan(10)
  })
})
