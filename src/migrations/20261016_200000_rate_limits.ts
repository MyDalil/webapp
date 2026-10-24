import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** Compteurs de limitation de débit (hors schéma Payload : infrastructure, pas contenu). */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "rate_limits" (
      "key" varchar(120) PRIMARY KEY,
      "count" integer NOT NULL DEFAULT 1,
      "reset_at" timestamp(3) with time zone NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "rate_limits_reset_idx" ON "rate_limits" ("reset_at");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "rate_limits";`)
}
