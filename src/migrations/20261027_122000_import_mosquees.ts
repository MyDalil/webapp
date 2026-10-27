import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { importPlaces, type ImportRecord } from '@/modules/annuaire/importPlaces'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Mosquées et salles de prière OpenStreetMap absentes de DALIL, y compris sans nom (« Mosquée · nom à compléter »)
 * — `scripts/import/select-mosques.mjs`. Jamais un doublon d’un lieu de culte connu, jamais une zaouïa.
 */
export const up = deferred('20261027_122000_import_mosquees', async ({ db, payload, req }: MigrateUpArgs): Promise<void> => {
  const file = path.resolve(process.cwd(), 'src/modules/annuaire/data/osm-mosques-selected.json')
  const records = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as ImportRecord[]) : []
  if (records.length) await importPlaces(payload, req, records, db as never)
})

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  const file = path.resolve(process.cwd(), 'src/modules/annuaire/data/osm-mosques-selected.json')
  const ids = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as ImportRecord[]).map((r) => r.id) : []
  for (let i = 0; i < ids.length; i += 500) await payload.delete({ collection: 'places', req, overrideAccess: true, where: { 'source.externalId': { in: ids.slice(i, i + 500) } } })
}
