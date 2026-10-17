import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { mergeCriteria } from '@/modules/confiance'

/**
 * Critères de qualité : socle commun + critères du secteur (décision de Rad, 2026-10-17).
 * Chaque fiche publiée reçoit la nouvelle liste ; les résultats et précisions déjà saisis sont conservés.
 * Une fiche qui a un brouillon plus récent n’est pas touchée (pour ne jamais publier un brouillon).
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  const pending = await db.execute(sql`select distinct parent_id as id from _places_v where latest = true and version__status = 'draft'`)
  const skip = new Set((pending.rows as { id: number }[]).map((r) => r.id))
  const { docs } = await payload.find({ collection: 'places', where: { _status: { equals: 'published' } }, limit: 5000, depth: 0, req, overrideAccess: true })
  for (const p of docs) {
    if (skip.has(p.id)) continue
    const criteria = mergeCriteria(p.sector, (p.criteria ?? []) as never)
    await payload.update({ collection: 'places', id: p.id, data: { criteria: criteria as never, _status: 'published' }, req, overrideAccess: true, context: { skipRevalidate: true } })
  }
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // Pas de retour arrière automatique : les anciens intitulés restent lisibles dans l’historique des versions.
}
