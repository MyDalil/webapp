import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** Position des adresses dans l’index de recherche : « mosquée Draria » classe d’abord les mosquées proches de Draria. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "search_index" ADD COLUMN IF NOT EXISTS "lat" double precision, ADD COLUMN IF NOT EXISTS "lng" double precision`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "search_index" DROP COLUMN IF EXISTS "lat", DROP COLUMN IF EXISTS "lng"`)
}
