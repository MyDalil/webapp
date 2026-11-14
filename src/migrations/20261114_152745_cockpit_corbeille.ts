import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "places" ADD COLUMN "deleted_at" timestamp(3) with time zone;
  ALTER TABLE "_places_v" ADD COLUMN "version_deleted_at" timestamp(3) with time zone;
  CREATE INDEX "places_deleted_at_idx" ON "places" USING btree ("deleted_at");
  CREATE INDEX "_places_v_version_version_deleted_at_idx" ON "_places_v" USING btree ("version_deleted_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "places_deleted_at_idx";
  DROP INDEX "_places_v_version_version_deleted_at_idx";
  ALTER TABLE "places" DROP COLUMN "deleted_at";
  ALTER TABLE "_places_v" DROP COLUMN "version_deleted_at";`)
}
