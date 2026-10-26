import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { importPlaces, type ImportRecord } from '@/modules/annuaire/importPlaces'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Repères OpenStreetMap (ODbL, © les contributeurs OpenStreetMap) : écoles, mosquées, bureaux de poste, mairies, gares…
 * Faits seulement (nom, position, contacts, horaires), présentation factuelle rédigée par DALIL, statut « Repérée — à vérifier ».
 * Ne remplace jamais une fiche existante : la complète seulement.
 */
export const up = deferred('20261017_230000_import_osm', async ({ db, payload, req }: MigrateUpArgs): Promise<void> => {
  // Lu sur disque (pas importé) : le jeu (~15 Mo) reste hors des fonctions serveur. Migration appliquée au build (vercel-build).
  const osm = JSON.parse(readFileSync(path.resolve(process.cwd(), 'src/modules/annuaire/data/osm-selected.json'), 'utf8')) as unknown[]
  const PUBLIC = new Set(['administrations-services-publics', 'education-formation', 'transports-mobilite'])
  const records: ImportRecord[] = (osm as unknown as ImportRecord[]).map((r) => ({
    ...r,
    provider: 'osm',
    publicBody: PUBLIC.has(r.sector) || r.category === 'Hôpitaux',
  }))
  await importPlaces(payload, req, records, db as never)
})

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({ collection: 'places', req, overrideAccess: true, where: { 'source.externalId': { like: 'osm:' } } })
}
