import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'

/**
 * Premier patron (décision de Rad, 2026-11-25 : « Saïd = owner ») : sans aucun patron, le premier compte d’équipe créé
 * (Saïd en production) reçoit le rôle patron. Traitement sans compte : seule voie prévue pour nommer le premier patron
 * (src/platform/auth/Users.ts). Ne fait rien si un patron existe déjà, ni sur une base sans compte (CI, base neuve).
 */
export const up = deferred('20261125_090000_premier_patron', async ({ payload, req }: MigrateUpArgs): Promise<void> => {
  const patrons = await payload.count({ collection: 'users', req, overrideAccess: true, where: { role: { equals: 'patron' } } })
  if (patrons.totalDocs > 0) return
  const { docs } = await payload.find({ collection: 'users', req, overrideAccess: true, depth: 0, limit: 1, sort: 'id', select: { name: true } })
  if (!docs[0]) return
  await payload.update({ collection: 'users', id: docs[0].id, req, overrideAccess: true, data: { role: 'patron' } })
  payload.logger.info(`Premier patron : compte ${docs[0].id} (${docs[0].name ?? 'sans nom'})`)
})

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.warn('Premier patron : rôle conservé — un patron le retire depuis /admin si besoin.')
}
