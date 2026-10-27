import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "packs" ADD COLUMN "per_person" boolean DEFAULT false;
  ALTER TABLE "demandes_accompagnement" ADD COLUMN "persons" numeric DEFAULT 1;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "packs" DROP COLUMN "per_person";
  ALTER TABLE "demandes_accompagnement" DROP COLUMN "persons";`)
}
