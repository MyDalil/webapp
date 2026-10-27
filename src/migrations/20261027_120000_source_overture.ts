import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** Nouvelle source de fiches : Overture Maps (CDLA Permissive 2.0). */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TYPE "public"."enum_places_source_provider" ADD VALUE IF NOT EXISTS 'overture' BEFORE 'pro'`)
  await db.execute(sql`ALTER TYPE "public"."enum__places_v_version_source_provider" ADD VALUE IF NOT EXISTS 'overture' BEFORE 'pro'`)
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // Une valeur d’énumération Postgres ne se retire pas sans recréer le type : rien à faire.
}
