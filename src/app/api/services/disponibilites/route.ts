import { availability, getProvider, todayAlgiers } from '@/modules/services'
import { fail, json } from '@/platform/http'

/** Jours et heures de début possibles pour une prestation d’un prestataire. */
export async function GET(req: Request) {
  const u = new URL(req.url)
  const provider = await getProvider(u.searchParams.get('prestataire') ?? '')
  if (!provider) return fail('Prestataire introuvable.', 404)
  const from = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get('from') ?? '') ? (u.searchParams.get('from') as string) : todayAlgiers()
  const days = Math.min(21, Math.max(1, Number(u.searchParams.get('days')) || 14))
  return json({ days: await availability(provider, u.searchParams.get('activite') ?? '', Number(u.searchParams.get('heures')) || undefined, from < todayAlgiers() ? todayAlgiers() : from, days) })
}
