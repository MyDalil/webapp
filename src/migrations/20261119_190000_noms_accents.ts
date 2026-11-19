import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { accentFr } from '@/platform/referentiel/accents'

/**
 * Accents français rétablis dans les noms d’adresses importés (« Ecole » → « École »), constat de Rad du 2026-11-19.
 * Seuls les noms qui changent sont écrits. Fiche et versions mises à jour ensemble. Le slug ne change pas (liens gardés).
 */
export const up = deferred('20261119_190000_noms_accents', async ({ db }: MigrateUpArgs): Promise<void> => {
  const { rows } = await db.execute(sql`SELECT id, name FROM places WHERE name ~ '[A-Za-z]'`)
  for (const r of rows as Array<{ id: number; name: string | null }>) {
    if (!r.name) continue
    const fixed = accentFr(r.name)
    if (fixed === r.name) continue
    await db.execute(sql`UPDATE places SET name = ${fixed} WHERE id = ${r.id}`)
    await db.execute(sql`UPDATE _places_v SET version_name = ${fixed} WHERE parent_id = ${r.id} AND version_name = ${r.name}`)
  }
})

export async function down(_: MigrateDownArgs): Promise<void> {}
