import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_submissions_status" ADD VALUE 'needs_info' BEFORE 'done';
  CREATE TABLE "campaigns" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"subject" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar NOT NULL,
  	"cta_label" varchar,
  	"cta_url" varchar,
  	"send_test" boolean,
  	"send_now" boolean,
  	"sent_at" timestamp(3) with time zone,
  	"recipients" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "submissions" ADD COLUMN "reply" varchar;
  ALTER TABLE "subscribers" ADD COLUMN "unsubscribed_at" timestamp(3) with time zone;
  ALTER TABLE "subscribers" ADD COLUMN "unsub_token" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "campaigns_id" integer;
  CREATE INDEX "campaigns_updated_at_idx" ON "campaigns" USING btree ("updated_at");
  CREATE INDEX "campaigns_created_at_idx" ON "campaigns" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_campaigns_fk" FOREIGN KEY ("campaigns_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "subscribers_unsub_token_idx" ON "subscribers" USING btree ("unsub_token");
  CREATE INDEX "payload_locked_documents_rels_campaigns_id_idx" ON "payload_locked_documents_rels" USING btree ("campaigns_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "campaigns" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "campaigns" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_campaigns_fk";
  
  ALTER TABLE "submissions" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'new'::text;
  DROP TYPE "public"."enum_submissions_status";
  CREATE TYPE "public"."enum_submissions_status" AS ENUM('new', 'processing', 'done', 'rejected');
  ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'new'::"public"."enum_submissions_status";
  ALTER TABLE "submissions" ALTER COLUMN "status" SET DATA TYPE "public"."enum_submissions_status" USING "status"::"public"."enum_submissions_status";
  DROP INDEX "subscribers_unsub_token_idx";
  DROP INDEX "payload_locked_documents_rels_campaigns_id_idx";
  ALTER TABLE "submissions" DROP COLUMN "reply";
  ALTER TABLE "subscribers" DROP COLUMN "unsubscribed_at";
  ALTER TABLE "subscribers" DROP COLUMN "unsub_token";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "campaigns_id";`)
}
