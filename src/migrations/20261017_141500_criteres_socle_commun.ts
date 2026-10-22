import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { mergeCriteria } from '@/modules/confiance'

/**
 * Critères de qualité : socle commun + critères du secteur (décision de Rad, 2026-10-17).
 * Chaque fiche publiée reçoit la nouvelle liste ; les résultats et précisions déjà saisis sont conservés.
 * Une fiche qui a un brouillon plus récent n’est pas touchée (pour ne jamais publier un brouillon).
 *
 * Placée après toutes les migrations de schéma du 17 octobre : elle écrit avec le schéma complet de `places`
 * (première version, 083000, exécutée avant l’ajout de `contributor` → build preview en échec).
 */
export const up = deferred('20261017_141500_criteres_socle_commun', async ({ db, payload, req }: MigrateUpArgs): Promise<void> => {
  const pending = await db.execute(sql`select distinct parent_id as id from _places_v where latest = true and version__status = 'draft'`)
  const skip = new Set((pending.rows as { id: number }[]).map((r) => r.id))
  const { docs } = await payload.find({ collection: 'places', where: { _status: { equals: 'published' } }, limit: 5000, depth: 0, req, overrideAccess: true })
  const skipped: string[] = []
  for (const p of docs) {
    if (skip.has(p.id)) continue
    const criteria = mergeCriteria(p.sector, (p.criteria ?? []) as never)
    try {
      await payload.update({ collection: 'places', id: p.id, data: { criteria: criteria as never, _status: 'published' }, req, overrideAccess: true, context: { skipRevalidate: true } })
    } catch (e) {
      // Fiche incomplète (validation) : on la laisse telle quelle, elle recevra les critères à sa prochaine modification.
      skipped.push(`${p.id} (${(e as Error).message})`)
    }
  }
  if (skipped.length) payload.logger.warn(`Critères non appliqués à ${skipped.length} fiche(s) : ${skipped.join(' ; ')}`)
})

export async function down(_: MigrateDownArgs): Promise<void> {
  // Pas de retour arrière automatique : les anciens intitulés restent lisibles dans l’historique des versions.
}
