import 'server-only'
import type { Member } from '@/payload-types'
import { payload as getPayload } from '@/platform/http'
import { KIT_COLLECTIONS, kitCard, kitEligible, kitPath, type KitDoc } from './kitRules'

/** Fiche du kit si elle est réellement vérifiée (sinon null → 404). Lecture seule. */
export async function kitTarget(collection: string, slug: string) {
  if (!KIT_COLLECTIONS.includes(collection as (typeof KIT_COLLECTIONS)[number]) || !/^[a-z0-9-]{1,160}$/.test(slug)) return null
  const p = await getPayload()
  const { docs } = await (p as unknown as { find: (a: Record<string, unknown>) => Promise<{ docs: KitDoc[] }> }).find({
    collection,
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const d = docs[0]
  if (!kitEligible(collection, d)) return null
  return { path: kitPath(collection, slug), ...kitCard(collection, d) }
}

/** Kits disponibles pour le compte pro connecté (fiches qu’il possède et qui sont vérifiées). */
export async function myKits(member: Member): Promise<{ collection: string; slug: string; name: string }[]> {
  const p = await getPayload()
  const out: { collection: string; slug: string; name: string }[] = []
  for (const collection of ['practitioners', 'providers'] as const) {
    const { docs } = await p.find({ collection, where: { owner: { equals: member.id } }, depth: 0, limit: 10, overrideAccess: true })
    for (const d of docs as unknown as KitDoc[]) if (kitEligible(collection, d)) out.push({ collection, slug: String(d.slug), name: kitCard(collection, d).name })
  }
  return out
}
