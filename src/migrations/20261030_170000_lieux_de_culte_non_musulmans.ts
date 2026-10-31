import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'

/**
 * La catégorie « Mosquées » ne contient que des mosquées et salles de prière.
 * Synagogues, églises, temples et cathédrales importés à tort (Overture/OSM) passent en « Monuments et sites historiques ».
 * Les noms reclassés sont écrits dans le journal du déploiement.
 */
const PATTERN = '(synagogue|église|eglise|temple|cathédrale|cathedrale|basilique|church|كنيسة|كنيس)'
// Prudence : une « ancienne église » est souvent devenue mosquée (Ketchaoua) ; un nom ambigu reste où il est.
const KEEP = '(ancienne|ancien|ex-|femmes|mosquée|mosquee|masjid|djamaa|jamaa|مسجد|جامع)'

export const up = deferred('20261030_170000_lieux_de_culte_non_musulmans', async ({ payload }: MigrateUpArgs): Promise<void> => {
  const res = await payload.db.drizzle.execute(sql`
    update places set sector = 'culture-nature-loisirs', category = 'Monuments et sites historiques'
    where sector = 'mosquees-priere' and (name ~* ${PATTERN} or coalesce(name_ar, '') ~* ${PATTERN}) and name !~* ${KEEP}
    returning id, name`)
  const rows = (res as unknown as { rows: { id: number; name: string }[] }).rows
  payload.logger.info(`Lieux de culte non musulmans reclassés : ${rows.map((r) => r.name).join(', ') || 'aucun'}`)
})

export async function down(_: MigrateDownArgs): Promise<void> {}
