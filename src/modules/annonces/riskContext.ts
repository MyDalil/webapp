import type { PayloadRequest } from 'payload'
import { median, scoreClassified, type Risk } from './risk'

type Ad = { id: number; title: string; description: string; category: string; subcategory: string; price?: number | null; photos?: unknown[] | null; reports?: number | null; author?: number | { id: number } | null; example?: boolean | null; createdAt: string }
const idOf = (v: Ad['author']) => (v && typeof v === 'object' ? v.id : v ?? null)

/** Scores de plusieurs annonces en une passe : médianes par type, âge et rafale des auteurs, textes copiés. */
export async function classifiedRisks(req: PayloadRequest, ads: Ad[]): Promise<Map<number, Risk>> {
  const out = new Map<number, Risk>()
  if (!ads.length) return out
  const p = req.payload
  const subs = [...new Set(ads.map((a) => a.subcategory))]
  const authors = [...new Set(ads.map((a) => idOf(a.author)).filter((x): x is number => x != null))]
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const [prices, members, recent, twins] = await Promise.all([
    p.find({ collection: 'classifieds', req, overrideAccess: false, depth: 0, pagination: false, select: { subcategory: true, price: true } as never, where: { and: [{ status: { equals: 'published' } }, { example: { not_equals: true } }, { subcategory: { in: subs } }, { price: { greater_than: 0 } }] } }),
    authors.length ? p.find({ collection: 'members', req, overrideAccess: false, depth: 0, pagination: false, select: { createdAt: true } as never, where: { id: { in: authors } } }) : Promise.resolve({ docs: [] }),
    authors.length ? p.find({ collection: 'classifieds', req, overrideAccess: false, depth: 0, pagination: false, select: { author: true } as never, where: { and: [{ author: { in: authors } }, { createdAt: { greater_than_equal: since } }] } }) : Promise.resolve({ docs: [] }),
    p.find({ collection: 'classifieds', req, overrideAccess: false, depth: 0, pagination: false, select: { description: true, author: true } as never, where: { description: { in: ads.map((a) => a.description) } } }),
  ])
  const bySub = new Map<string, number[]>()
  for (const d of prices.docs as unknown as Ad[]) bySub.set(d.subcategory, [...(bySub.get(d.subcategory) ?? []), Number(d.price)])
  const born = new Map((members.docs as Array<{ id: number; createdAt: string }>).map((m) => [m.id, m.createdAt]))
  const burst = new Map<number, number>()
  for (const d of recent.docs as unknown as Ad[]) { const a = idOf(d.author); if (a != null) burst.set(a, (burst.get(a) ?? 0) + 1) }
  for (const a of ads) {
    const author = idOf(a.author)
    const created = author != null ? born.get(author) : undefined
    out.set(a.id, scoreClassified({
      title: a.title, description: a.description, category: a.category, price: a.price, photos: a.photos?.length ?? 0, reports: a.reports ?? 0,
      authorAgeDays: a.example ? null : created ? (Date.now() - new Date(created).getTime()) / 86_400_000 : null,
      authorLast24h: author != null ? burst.get(author) ?? 0 : 0,
      medianPrice: median(bySub.get(a.subcategory) ?? []),
      sameText: (twins.docs as unknown as Ad[]).filter((t) => t.id !== a.id && t.description === a.description && idOf(t.author) !== author).length,
    }))
  }
  return out
}
