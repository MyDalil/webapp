import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { RULED_CATEGORIES, refinedCategory } from '@/modules/annuaire/categoryRules'

/**
 * Fourre-tout rangés d’après le nom (décision de Rad, 2026-11-15) : dentistes hors de « Médecins », stations-service,
 * lavage et pièces hors de « Services automobiles », tribunaux, sécurité sociale, impôts, daïras hors de « Administrations ».
 * Le secteur ne change pas. Un nom qui ne dit rien garde sa catégorie. Fiche et versions mises à jour ensemble.
 */
export const up = deferred('20261115_150000_fourre_tout_ranges', async ({ db }: MigrateUpArgs): Promise<void> => {
  for (const category of RULED_CATEGORIES) {
    const { rows } = await db.execute(sql`SELECT id, name, name_ar FROM places WHERE category = ${category}`)
    const groups = new Map<string, number[]>()
    for (const r of rows as Array<{ id: number; name: string; name_ar: string | null }>) {
      const t = refinedCategory(category, r.name ?? '') ?? refinedCategory(category, r.name_ar ?? '')
      if (t) groups.set(t, [...(groups.get(t) ?? []), Number(r.id)])
    }
    for (const [target, ids] of groups) {
      const list = sql.raw(ids.join(','))
      await db.execute(sql`UPDATE places SET category = ${target} WHERE id IN (${list})`)
      await db.execute(sql`UPDATE _places_v SET version_category = ${target} WHERE parent_id IN (${list})`)
    }
  }
})

export async function down(_: MigrateDownArgs): Promise<void> {}
