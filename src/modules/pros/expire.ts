import 'server-only'
import { payload as getPayload } from '@/platform/http'
import { expiredIds } from './sponsoringCore'

/**
 * Fin des mises en avant : passe à « terminée » les sponsorisations actives dont la date de fin est dépassée.
 * Le hook de la collection vide le cache et rafraîchit les listes concernées. À appeler par la tâche quotidienne.
 */
export async function expireSponsorships(now = new Date()): Promise<{ terminees: number }> {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'sponsorships', where: { and: [{ status: { equals: 'active' } }, { endsAt: { less_than_equal: now.toISOString() } }] }, depth: 0, limit: 500, pagination: false, overrideAccess: true })
  let terminees = 0
  for (const id of expiredIds(docs, now)) {
    await p.update({ collection: 'sponsorships', id, data: { status: 'terminee' }, overrideAccess: true, context: { channel: 'cron' } })
    terminees++
  }
  return { terminees }
}
