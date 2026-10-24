import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** Alertes « 80 % du budget IA » : une seule par mois (hors schéma Payload). */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS "ai_budget_alerts" ("month" varchar(7) PRIMARY KEY, "sent_at" timestamp(3) with time zone NOT NULL DEFAULT now());`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "ai_budget_alerts";`)
}
