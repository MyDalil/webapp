import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { importPlaces, type ImportRecord } from '@/modules/annuaire/importPlaces'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const file = (n: string) => path.resolve(process.cwd(), `src/modules/annuaire/data/${n}`)
const read = <T>(n: string, empty: T): T => (existsSync(file(n)) ? (JSON.parse(readFileSync(file(n), 'utf8')) as T) : empty)
const LABEL = 'Overture Maps — © Overture Maps Foundation (CDLA Permissive 2.0)'

/**
 * Lieux Overture Maps (licence libre, couverture proche des grands services de cartes) — `scripts/import/select-overture.mjs`.
 * 1. Nouvelles fiches « À vérifier » (jamais un doublon d’une fiche existante, jamais un lieu exclu).
 * 2. Fiches existantes : seulement les champs vides complétés (téléphone, site, email, Facebook, Instagram, adresse), source ajoutée.
 */
export const up = deferred('20261027_121000_import_overture', async ({ db, payload, req }: MigrateUpArgs): Promise<void> => {
  const records = read<ImportRecord[]>('overture-selected.json', [])
  if (records.length) await importPlaces(payload, req, records, db as never)
  const complete = read<Record<string, Record<string, string>>>('overture-complete.json', {})
  const rows = Object.entries(complete).map(([ext, f]) => ({ ext, ...f }))
  for (let i = 0; i < rows.length; i += 1000) {
    const part = JSON.stringify(rows.slice(i, i + 1000))
    await db.execute(sql`
      UPDATE places p SET
        phone = COALESCE(NULLIF(p.phone, ''), x.phone), email = COALESCE(NULLIF(p.email, ''), x.email),
        website = COALESCE(NULLIF(p.website, ''), x.website), facebook = COALESCE(NULLIF(p.facebook, ''), x.facebook),
        instagram = COALESCE(NULLIF(p.instagram, ''), x.instagram), address = COALESCE(NULLIF(p.address, ''), x.address)
      FROM jsonb_to_recordset(${part}::jsonb) AS x(ext text, phone text, email text, website text, facebook text, instagram text, address text)
      WHERE p.source_external_id = x.ext`)
    await db.execute(sql`
      INSERT INTO places_sources (_order, _parent_id, id, label, url)
      SELECT 99, p.id, substr(md5(random()::text || p.id::text), 1, 24), ${LABEL}, 'https://overturemaps.org'
      FROM jsonb_to_recordset(${part}::jsonb) AS x(ext text) JOIN places p ON p.source_external_id = x.ext
      WHERE NOT EXISTS (SELECT 1 FROM places_sources s WHERE s._parent_id = p.id AND s.label = ${LABEL})`)
  }
  payload.logger.info(`Overture : ${records.length} fiches proposées, ${rows.length} fiches existantes complétées`)
})

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({ collection: 'places', req, overrideAccess: true, where: { 'source.provider': { equals: 'overture' } } })
}
