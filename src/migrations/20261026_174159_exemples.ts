import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "classifieds" ALTER COLUMN "author_id" DROP NOT NULL;
  ALTER TABLE "classifieds" ADD COLUMN "example" boolean DEFAULT false;
  CREATE INDEX "classifieds_example_idx" ON "classifieds" USING btree ("example");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "classifieds_example_idx";
  ALTER TABLE "classifieds" ALTER COLUMN "author_id" SET NOT NULL;
  ALTER TABLE "classifieds" DROP COLUMN "example";`)
}
