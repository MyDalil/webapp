import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { splitPlaceName } from '@/platform/referentiel/accents'

/**
 * Noms d’adresses importés (constats de Rad du 2026-11-19) : accents français rétablis (« Ecole » → « École ») ;
 * nom en plusieurs langues (« Stade du 5 juillet | 5 July Stadium | ملعب… ») réduit au français, l’anglais et l’arabe
 * rangés dans leurs champs s’ils sont vides.
 * Seuls les noms qui changent sont écrits. Fiche et versions mises à jour ensemble. Le slug ne change pas (liens gardés).
 */
export const up = deferred('20261119_190000_noms_accents', async ({ db }: MigrateUpArgs): Promise<void> => {
  const { rows } = await db.execute(sql`SELECT id, name, name_en, name_ar FROM places WHERE name ~ '[A-Za-z]'`)
  for (const r of rows as Array<{ id: number; name: string | null; name_en: string | null; name_ar: string | null }>) {
    if (!r.name) continue
    const n = splitPlaceName(r.name)
    if (n.name === r.name) continue
    const en = r.name_en || n.nameEn || null
    const ar = r.name_ar || n.nameAr || null
    await db.execute(sql`UPDATE places SET name = ${n.name}, name_en = ${en}, name_ar = ${ar} WHERE id = ${r.id}`)
    await db.execute(sql`UPDATE _places_v SET version_name = ${n.name}, version_name_en = coalesce(version_name_en, ${en}), version_name_ar = coalesce(version_name_ar, ${ar}) WHERE parent_id = ${r.id} AND version_name = ${r.name}`)
  }
})

export async function down(_: MigrateDownArgs): Promise<void> {}
