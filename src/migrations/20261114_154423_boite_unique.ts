import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_submissions_kind" ADD VALUE 'email';
  ALTER TABLE "submissions" ADD COLUMN "thread" jsonb;
  ALTER TABLE "submissions" ADD COLUMN "external_id" varchar;
  CREATE UNIQUE INDEX "submissions_external_id_idx" ON "submissions" USING btree ("external_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "submissions" ALTER COLUMN "kind" SET DATA TYPE text;
  DROP TYPE "public"."enum_submissions_kind";
  CREATE TYPE "public"."enum_submissions_kind" AS ENUM('contribution', 'application', 'contact', 'feedback', 'diagnostic', 'report');
  ALTER TABLE "submissions" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_submissions_kind" USING "kind"::"public"."enum_submissions_kind";
  DROP INDEX "submissions_external_id_idx";
  ALTER TABLE "submissions" DROP COLUMN "thread";
  ALTER TABLE "submissions" DROP COLUMN "external_id";`)
}
