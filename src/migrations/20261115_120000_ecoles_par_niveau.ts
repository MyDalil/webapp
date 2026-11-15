import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { schoolCategory } from '@/modules/annuaire/schoolCategory'

/**
 * Le fourre-tout « Écoles » est rangé par niveau (décision de Rad, 2026-11-15) : primaire, collège, lycée,
 * crèche, auto-école… quand le nom de la fiche le dit. Les écoles coraniques rejoignent la rubrique Vie musulmane.
 * Un nom qui ne dit pas son niveau reste dans « Écoles ». Fiche et versions mises à jour ensemble.
 */
export const up = deferred('20261115_120000_ecoles_par_niveau', async ({ db }: MigrateUpArgs): Promise<void> => {
  const { rows } = await db.execute(sql`SELECT id, name FROM places WHERE sector = 'education-formation' AND category = 'Écoles'`)
  const groups = new Map<string, number[]>()
  for (const r of rows as Array<{ id: number; name: string }>) {
    const t = schoolCategory(r.name ?? '')
    if (!t) continue
    const key = `${t.sector}|${t.category}`
    groups.set(key, [...(groups.get(key) ?? []), Number(r.id)])
  }
  for (const [key, ids] of groups) {
    const [sector, category] = key.split('|')
    const list = sql.raw(ids.join(','))
    await db.execute(sql`UPDATE places SET sector = ${sector}, category = ${category} WHERE id IN (${list})`)
    await db.execute(sql`UPDATE _places_v SET version_sector = ${sector}, version_category = ${category} WHERE parent_id IN (${list})`)
  }
})

export async function down(_: MigrateDownArgs): Promise<void> {}
