import 'server-only'
import { payload } from '@/platform/http'
import { ficheOfferOf, type LeadTarget, type Plan } from './offreRules'
import { planOf } from './subscriptions'

/**
 * Offre des fiches côté serveur : plan payant, demande de contact, assistant Premium, classement « Partenaire ».
 * Plan d’une fiche = `planOf` du lot K (liste des abonnements en cours, en cache par étiquette `subscriptions`).
 */

/** Plans payants parmi des fiches : clé `collection:id` (une seule lecture en cache pour toutes les fiches). */
export async function paidPlans(targets: { collection: string; id: string }[]): Promise<Map<string, Plan>> {
  const out = new Map<string, Plan>()
  const plans = await Promise.all(targets.map(async (t) => [`${t.collection}:${t.id}`, await planOf(t.collection, t.id)] as const))
  for (const [k, plan] of plans) if (plan !== 'gratuit') out.set(k, plan)
  return out
}

type FicheDoc = { id: number; owner?: number | { id: number; email?: string | null } | null; category?: string | null; demo?: boolean | null; name?: string | null; displayName?: string | null }

/** Fiche publiée (propriétaire lu côté serveur seulement, jamais renvoyé au visiteur). */
export async function ficheOwner(collection: LeadTarget, id: string | number): Promise<{ doc: FicheDoc; ownerEmail: string | null } | null> {
  const p = await payload()
  const doc = (await p.findByID({ collection, id: Number(id), depth: 1, overrideAccess: true, disableErrors: true })) as unknown as (FicheDoc & { _status?: string; status?: string }) | null
  if (!doc) return null
  const published = collection === 'places' ? doc._status === 'published' : doc.status === 'published'
  if (!published) return null
  const owner = doc.owner && typeof doc.owner === 'object' ? doc.owner : null
  return { doc, ownerEmail: owner?.email ?? null }
}

/** Ce que la fiche propose au visiteur (demande, assistant). Jamais d’erreur : en cas de doute, rien. */
export async function ficheOffer(collection: LeadTarget, id: string | number, category?: string | null) {
  try {
    const [f, plan] = await Promise.all([ficheOwner(collection, id), planOf(collection, id)])
    if (!f) return { lead: null, assistant: false, plan: 'gratuit' as Plan }
    return ficheOfferOf({ collection, category: category ?? f.doc.category ?? null, hasOwner: Boolean(f.doc.owner), plan, demo: f.doc.demo })
  } catch {
    return { lead: null, assistant: false, plan: 'gratuit' as Plan }
  }
}
