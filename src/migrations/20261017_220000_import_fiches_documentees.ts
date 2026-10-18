import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { importPlaces, type ImportRecord } from '@/modules/annuaire/importPlaces'
import research from '@/modules/annuaire/data/research-places.json'

/**
 * Fiches documentées sur les sites officiels (ministères, wilayas, universités, hôpitaux, tourisme, grandes mosquées).
 * Faits vérifiés à la source, textes rédigés par DALIL, statut « Repérée — à vérifier ».
 * Complète les fiches existantes sans rien écraser.
 */
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const PUBLIC = new Set(['administrations-services-publics', 'education-formation', 'sante-soins'])
  const records: ImportRecord[] = (research as Record<string, unknown>[]).map((r) => ({
    ...(r as unknown as ImportRecord),
    provider: 'dalil',
    note: `Vérifié sur ${r.sourceUrl} le ${r.checkedAt ?? '2026-10-17'} — confiance ${r.confidence ?? 'moyenne'}.`,
    publicBody: PUBLIC.has(String(r.sector)) && String(r.category) !== 'Cliniques',
  }))
  await importPlaces(payload, req, records)
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({ collection: 'places', req, overrideAccess: true, where: { 'source.externalId': { like: 'research:' } } })
}
