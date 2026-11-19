import 'server-only'
import { unstable_cache } from 'next/cache'
import { payload as getPayload } from '@/platform/http'
import { PRICING_TAG } from './pricingGlobal'
import type { PricingDoc } from './subscriptionsCore'

const fetchPricing = async (): Promise<PricingDoc> => {
  const p = await getPayload()
  return (await p.findGlobal({ slug: 'pricing', depth: 0, overrideAccess: true })) as unknown as PricingDoc
}
const cached = unstable_cache(fetchPricing, ['pros-pricing'], { tags: [PRICING_TAG], revalidate: 3600 })

/**
 * Tarifs des professionnels (global `pricing`), en cache par étiquette `pricing` (vidé à chaque enregistrement).
 * Un prix vide reste vide : le site affiche « Tarif sur demande ». Panne → tarifs vides, jamais un prix inventé.
 */
export async function getPricing(): Promise<PricingDoc> {
  try {
    return await cached()
  } catch {
    try {
      return await fetchPricing()
    } catch {
      return { annualFreeMonths: null, plans: [] }
    }
  }
}
