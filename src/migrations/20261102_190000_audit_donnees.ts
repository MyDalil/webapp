import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { expectedHealthCategory } from '@/modules/annuaire/healthCategory'

type Db = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }> }

/**
 * Audit du 2 novembre 2026 — corrections de données (D05, D06, A08). Rejouable sans effet de bord.
 * 1. Wilayas 61 à 69 : codes remis au décret 26-206 (JO n° 40 du 3 juin 2026). Les fiches avaient été rangées selon
 *    l’ancienne liste (61 = Ksar Chellala…). Correction seulement si la base est encore à l’ancienne numérotation
 *    (fiches de Ksar Chellala sous 61) : une base neuve, importée avec la bonne liste, n’est jamais renumérotée.
 * 2. Coordonnées d’Algérie Poste rattachées à une fiche qui n’est pas un service public (ex. site de Timgad) :
 *    mises en quarantaine (retirées de la fiche, gardées dans la note interne pour vérification).
 * 3. Santé : catégorie corrigée quand le nom la contredit (vétérinaires, pharmacies, laboratoires, cabinets).
 */
const OLD_TO_NEW: Record<string, string> = { '61': '64', '62': '66', '63': '65', '64': '68', '65': '69', '66': '61', '67': '62', '68': '67', '69': '63' }
const remap = (col: string) => sql.raw(`CASE ${col}::text ${Object.entries(OLD_TO_NEW).map(([o, n]) => `WHEN '${o}' THEN '${n}'`).join(' ')} ELSE ${col}::text END`)

export const up = deferred('20261102_190000_audit_donnees', async ({ payload }: MigrateUpArgs): Promise<void> => {
  const db = (payload.db as unknown as { drizzle: Db }).drizzle
  const log: Record<string, unknown> = {}

  const { rows: old } = await db.execute(sql`SELECT count(*)::int AS n FROM places WHERE wilaya::text = '61' AND lower(city) LIKE '%ksar chellala%'`)
  if (Number(old[0]?.n) > 0) {
    const targets: [string, string, string][] = [
      ['places', 'wilaya', 'enum_places_wilaya'],
      ['_places_v', 'version_wilaya', 'enum__places_v_version_wilaya'],
      ['events', 'wilaya', 'enum_events_wilaya'],
      ['_events_v', 'version_wilaya', 'enum__events_v_version_wilaya'],
      ['practitioners', 'wilaya', 'enum_practitioners_wilaya'],
      ['providers', 'wilaya', 'enum_providers_wilaya'],
      ['classifieds', 'wilaya', 'enum_classifieds_wilaya'],
    ]
    for (const [table, col, type] of targets) {
      const r = await db.execute(sql`UPDATE ${sql.raw(`"${table}"`)} SET ${sql.raw(`"${col}"`)} = (${remap(`"${col}"`)})::${sql.raw(`"${type}"`)} WHERE ${sql.raw(`"${col}"`)}::text IN ('61','62','63','64','65','66','67','68','69') RETURNING 1`)
      log[table] = r.rows.length
    }
    const s = await db.execute(sql`UPDATE search_index SET wilaya = ${remap('wilaya')} WHERE wilaya IN ('61','62','63','64','65','66','67','68','69') RETURNING 1`)
    log.search_index = s.rows.length
  } else log.wilayas = 'déjà à la numérotation officielle'

  const q = await db.execute(sql`
    UPDATE places SET
      internal_note = concat_ws(E'\n', internal_note, 'Quarantaine (audit 2026-11-02) : coordonnées d’Algérie Poste retirées, à vérifier — site ' || coalesce(website, '—') || ', email ' || coalesce(email, '—') || '.'),
      website = CASE WHEN website ILIKE '%poste.dz%' THEN NULL ELSE website END,
      email = CASE WHEN email ILIKE '%poste.dz%' THEN NULL ELSE email END
    WHERE sector::text <> 'administrations-services-publics' AND (website ILIKE '%poste.dz%' OR email ILIKE '%poste.dz%')
    RETURNING id`)
  log.quarantaine = q.rows.map((r) => r.id)

  const { rows } = await db.execute(sql`SELECT id, name, category FROM places WHERE sector::text = 'sante-soins'`)
  let moved = 0
  for (const r of rows) {
    const to = expectedHealthCategory(String(r.name ?? ''), String(r.category ?? ''))
    if (!to) continue
    await payload.update({ collection: 'places', id: Number(r.id), overrideAccess: true, context: { skipRevalidate: true }, data: { category: to } })
    moved++
  }
  log.santeReclassees = moved
  payload.logger.info(`Audit données : ${JSON.stringify(log)}`)
})

export async function down(_: MigrateDownArgs): Promise<void> {
  // Corrections de données : jamais annulées automatiquement (la quarantaine reste lisible dans la note interne).
}
