import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Mémoire des échecs de la tâche `photos-libres` (hors schéma Payload, comme `search_index`) : une adresse dont la photo
 * est introuvable, trop lourde ou en erreur n’est pas retentée pendant 30 jours (sinon elle bloquerait la tête du classement).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "photos_libres_echecs" (
      "place_id" integer PRIMARY KEY,
      "at" timestamp(3) with time zone NOT NULL DEFAULT now(),
      "raison" varchar(200)
    );`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "photos_libres_echecs";`)
}
