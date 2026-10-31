import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { slugify } from '@/platform/referentiel/slug'

/**
 * Fiches sans adresse de page (nom seulement en arabe : le slug sortait vide, lien « /adresses » cassé).
 * Nouveau slug translittéré + identifiant (toujours unique). Ne touche qu’aux slugs vides ou sans lettre latine.
 */
export const up = deferred('20261030_160000_adresses_sans_slug', async ({ payload }: MigrateUpArgs): Promise<void> => {
  const db = payload.db.drizzle
  const res = await db.execute(sql`select id, name, city from places where slug is null or slug !~ '[a-z0-9]'`)
  const rows = (res as unknown as { rows: { id: number; name: string | null; city: string | null }[] }).rows
  for (const r of rows) {
    const base = slugify(`${r.name ?? ''} ${r.city ?? ''}`).slice(0, 80).replace(/-$/, '') || 'lieu'
    await db.execute(sql`update places set slug = ${`${base}-${r.id}`} where id = ${r.id}`)
  }
  payload.logger.info(`Adresses de page créées pour ${rows.length} fiche(s).`)
})

export async function down(_: MigrateDownArgs): Promise<void> {}
