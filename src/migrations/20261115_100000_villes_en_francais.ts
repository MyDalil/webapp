import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { frenchCity } from '@/modules/annuaire/cityName'

/**
 * Villes importées en arabe ou en écritures mêlées : nom français quand il est connu sans doute (partie latine
 * déjà présente, ou commune du référentiel). L’ancienne valeur passe dans `place` si ce champ est vide : rien n’est perdu.
 * Les autres fiches restent telles quelles. Fiche et dernière version mises à jour ensemble.
 */
export const up = deferred('20261115_100000_villes_en_francais', async ({ db }: MigrateUpArgs): Promise<void> => {
  const { rows } = await db.execute(sql`SELECT DISTINCT wilaya, city FROM places WHERE city ~ '[؀-ۿ]'`)
  for (const r of rows as Array<{ wilaya: string | null; city: string }>) {
    const fr = frenchCity(r.city, r.wilaya)
    if (!fr) continue
    await db.execute(sql`UPDATE places SET city = ${fr} WHERE city = ${r.city} AND wilaya IS NOT DISTINCT FROM ${r.wilaya}`)
    await db.execute(sql`UPDATE _places_v SET version_city = ${fr} WHERE version_city = ${r.city} AND version_wilaya IS NOT DISTINCT FROM ${r.wilaya}`)
  }
})

export async function down(_: MigrateDownArgs): Promise<void> {}
