import 'server-only'
import type { Where } from 'payload'
import { unstable_cache } from 'next/cache'
import { payload as getPayload } from '@/platform/http'
import { SPONSORSHIPS_TAG, refreshSponsorships } from './refresh'
import { SEARCH_TYPE_TARGET, SPONSORED_MAX, eligibleSponsorships, liftSponsored, selectSponsored, type Sponsored, type SponsorTarget, type Sponsorship } from './sponsoringCore'

/**
 * Mise en avant payante — lecture des sponsorisations (collection `sponsorships`).
 * Cache Next par étiquette `sponsorships` (sans Cache Components : `unstable_cache`) : vidé par le hook de la collection
 * à chaque activation, refus, fin ou suppression ; 5 minutes au plus sinon (les dates sont contrôlées à chaque appel).
 */
const fetchActive = async (): Promise<Sponsorship[]> => {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'sponsorships', where: { status: { equals: 'active' } }, limit: 500, depth: 0, overrideAccess: true, pagination: false })
  return docs.map((d) => ({ id: d.id, targetCollection: d.targetCollection, targetId: String(d.targetId), kind: d.kind, wilaya: d.wilaya ?? null, startsAt: d.startsAt ?? null, endsAt: d.endsAt ?? null, status: d.status }))
}
const cachedActive = unstable_cache(fetchActive, ['pros-sponsorships-active'], { tags: [SPONSORSHIPS_TAG], revalidate: 300 })

/** Sponsorisations au statut « active ». Hors contexte Next : lecture directe. Une panne ne bloque jamais une page. */
export async function loadActiveSponsorships(): Promise<Sponsorship[]> {
  try {
    return await cachedActive()
  } catch {
    try {
      return await fetchActive()
    } catch {
      return []
    }
  }
}

/** Vide le cache et rafraîchit les listes (après activation, refus ou fin). */
export const forgetSponsorships = (targets: (SponsorTarget | null | undefined)[] = []) => refreshSponsorships(targets)

export async function activeSponsorships(opts: { collection?: SponsorTarget; wilaya?: string | number | null; max?: number } = {}) {
  return selectSponsored(await loadActiveSponsorships(), opts)
}

/**
 * Pour la recherche, les actions et le MCP (lot B) : sépare les résultats sponsorisés (≤ 2, marqués `sponsored: true`)
 * des autres, dont l’ordre de confiance reste intact. `hits` : résultats de l’index (`type` + `id`).
 */
export async function sponsoredFor<T extends { type: string; id: string | number }>(hits: T[], opts: { wilaya?: string | number | null } = {}): Promise<{ sponsored: Sponsored<T>[]; rest: T[] }> {
  if (!hits.length) return { sponsored: [], rest: hits }
  const running = eligibleSponsorships(await loadActiveSponsorships(), { wilaya: opts.wilaya })
  return liftSponsored(hits, running, (h) => (SEARCH_TYPE_TARGET[h.type] ? { collection: SEARCH_TYPE_TARGET[h.type], id: String(h.id) } : null))
}

export type SponsoredItem = { collection: SponsorTarget; id: string; title: string; subtitle: string | null; url: string; sponsored: true; sponsorKind: Sponsorship['kind'] }

const PUBLISHED: Record<SponsorTarget, Where> = {
  places: { _status: { equals: 'published' } },
  practitioners: { status: { equals: 'published' } },
  providers: { status: { equals: 'published' } },
  classifieds: { status: { equals: 'published' } },
}

function present(collection: SponsorTarget, d: Record<string, unknown>): { title: string; subtitle: string | null; url: string } | null {
  const slug = typeof d.slug === 'string' && d.slug ? d.slug : null
  if (!slug) return null
  const city = (typeof d.city === 'string' && d.city) || (typeof d.commune === 'string' && d.commune) || null
  if (collection === 'places') return { title: String(d.name), subtitle: [d.category, city].filter(Boolean).join(' · ') || null, url: `/adresses/${slug}` }
  if (collection === 'practitioners') return { title: String(d.name), subtitle: [d.title, city].filter(Boolean).join(' · ') || null, url: `/praticiens/${slug}` }
  if (collection === 'providers') return { title: String(d.displayName), subtitle: city, url: `/prestataires/${slug}` }
  return { title: String(d.title), subtitle: city, url: `/annonces/${String(d.category)}/${slug}` }
}

/**
 * Fiches sponsorisées d’une liste (annuaire, praticiens, services, annonces), au plus 2, publiées seulement.
 * `where` restreint au sujet de la liste (catégorie, spécialité…) : une fiche hors sujet n’est jamais montrée.
 */
export async function sponsoredItems(collection: SponsorTarget, opts: { wilaya?: string | number | null; where?: Where; max?: number } = {}): Promise<SponsoredItem[]> {
  // Toutes les sponsorisations éligibles, dans l’ordre : une fiche non publiée ou hors sujet laisse sa place à la suivante.
  const candidates = eligibleSponsorships(await loadActiveSponsorships(), { collection, wilaya: opts.wilaya }).slice(0, 20)
  if (!candidates.length) return []
  try {
    const p = await getPayload()
    const ids = [...new Set(candidates.map((s) => String(s.targetId)))]
    const where: Where = { and: [{ id: { in: ids } }, PUBLISHED[collection], ...(opts.where ? [opts.where] : [])] }
    const docs = (await p.find({ collection, where, depth: 0, limit: ids.length, overrideAccess: false })).docs as unknown as Record<string, unknown>[]
    const by = new Map(docs.map((d) => [String(d.id), d]))
    const out: SponsoredItem[] = []
    for (const s of candidates) {
      const d = by.get(String(s.targetId))
      const view = d ? present(collection, d) : null
      if (!view || out.some((o) => o.id === String(s.targetId))) continue
      out.push({ collection, id: String(s.targetId), ...view, sponsored: true, sponsorKind: s.kind })
      if (out.length >= Math.min(SPONSORED_MAX, opts.max ?? SPONSORED_MAX)) break
    }
    return out
  } catch {
    return []
  }
}
