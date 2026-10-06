import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "subscribers" ADD COLUMN "confirmed_at" timestamp(3) with time zone;
  ALTER TABLE "subscribers" ADD COLUMN "token" varchar;
  CREATE INDEX "subscribers_token_idx" ON "subscribers" USING btree ("token");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "subscribers_token_idx";
  ALTER TABLE "subscribers" DROP COLUMN "confirmed_at";
  ALTER TABLE "subscribers" DROP COLUMN "token";`)
}
