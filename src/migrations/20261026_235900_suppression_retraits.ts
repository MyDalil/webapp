import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'

/**
 * Suppression définitive des fiches retirées le 2026-10-26 (demande explicite de Rad) : musique, zaouïas et écoles
 * coraniques soufies ou chiites, alcool. Passe par Payload : versions supprimées, index de recherche et journal d’audit à jour.
 * Restauration possible seulement par la sauvegarde quotidienne (Vercel Blob) ou l’historique Neon.
 * Un import futur ne les recrée pas (`exclusionReason` dans `importPlaces`).
 */
export const up = deferred('20261026_235900_suppression_retraits', async ({ payload, req }: MigrateUpArgs): Promise<void> => {
  const { docs } = await payload.find({
    collection: 'places',
    req,
    overrideAccess: true,
    depth: 0,
    limit: 5000,
    pagination: false,
    where: { and: [{ 'source.notes': { like: 'Retirée le 2026-10-26' } }, { _status: { equals: 'draft' } }] },
  })
  for (const d of docs) await payload.delete({ collection: 'places', id: d.id, req, overrideAccess: true, context: { skipRevalidate: true, channel: 'agent' } })
  payload.logger.info(`Suppression définitive : ${docs.length} fiches retirées`)
})

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.warn('Suppression définitive : irréversible par migration — restaurer depuis la sauvegarde (scripts/restore-backup.ts).')
}
