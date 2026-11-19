import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "controls" ADD COLUMN "off_sections" jsonb DEFAULT '[]'::jsonb;
  ALTER TABLE "controls" ADD COLUMN "off_message" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "controls" DROP COLUMN "off_sections";
  ALTER TABLE "controls" DROP COLUMN "off_message";`)
}
