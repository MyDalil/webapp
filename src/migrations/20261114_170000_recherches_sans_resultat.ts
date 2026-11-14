import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** Recherches sans résultat (module recherche) : texte normalisé, compteur, dates. Aucune donnée personnelle. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "search_misses" ("q" varchar(120) PRIMARY KEY, "count" integer NOT NULL DEFAULT 1, "first_at" timestamptz NOT NULL DEFAULT now(), "last_at" timestamptz NOT NULL DEFAULT now());
  CREATE INDEX IF NOT EXISTS "search_misses_last_at_idx" ON "search_misses" ("last_at");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "search_misses";`)
}
