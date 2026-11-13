import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_places_provenance_method" AS ENUM('import', 'official', 'phone', 'visit', 'pro', 'contribution');
  CREATE TYPE "public"."enum__places_v_version_provenance_method" AS ENUM('import', 'official', 'phone', 'visit', 'pro', 'contribution');
  CREATE TYPE "public"."enum_task_runs_status" AS ENUM('running', 'succeeded', 'failed', 'skipped');
  CREATE TYPE "public"."enum_email_deliveries_status" AS ENUM('pending', 'accepted', 'delivered', 'failed', 'bounced', 'complained', 'delayed');
  CREATE TABLE "places_provenance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field" varchar,
  	"value" varchar,
  	"conflict" boolean,
  	"source" varchar,
  	"source_id" varchar,
  	"collected_at" timestamp(3) with time zone,
  	"method" "enum_places_provenance_method",
  	"checked_at" timestamp(3) with time zone,
  	"checked_by" varchar
  );
  
  CREATE TABLE "_places_v_version_provenance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"field" varchar,
  	"value" varchar,
  	"conflict" boolean,
  	"source" varchar,
  	"source_id" varchar,
  	"collected_at" timestamp(3) with time zone,
  	"method" "enum__places_v_version_provenance_method",
  	"checked_at" timestamp(3) with time zone,
  	"checked_by" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "task_runs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"day" varchar NOT NULL,
  	"status" "enum_task_runs_status" NOT NULL,
  	"started_at" timestamp(3) with time zone,
  	"finished_at" timestamp(3) with time zone,
  	"duration_ms" numeric,
  	"attempts" numeric DEFAULT 1,
  	"result" jsonb,
  	"error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "email_deliveries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"idempotency_key" varchar,
  	"subject" varchar NOT NULL,
  	"recipient_hash" varchar,
  	"provider_id" varchar,
  	"status" "enum_email_deliveries_status" NOT NULL,
  	"attempts" numeric DEFAULT 0,
  	"error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "places" ADD COLUMN "next_verification_at" timestamp(3) with time zone;
  ALTER TABLE "_places_v" ADD COLUMN "version_next_verification_at" timestamp(3) with time zone;
  ALTER TABLE "error_logs" ADD COLUMN "last_alert_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "task_runs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "email_deliveries_id" integer;
  ALTER TABLE "places_provenance" ADD CONSTRAINT "places_provenance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v_version_provenance" ADD CONSTRAINT "_places_v_version_provenance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_places_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "places_provenance_order_idx" ON "places_provenance" USING btree ("_order");
  CREATE INDEX "places_provenance_parent_id_idx" ON "places_provenance" USING btree ("_parent_id");
  CREATE INDEX "_places_v_version_provenance_order_idx" ON "_places_v_version_provenance" USING btree ("_order");
  CREATE INDEX "_places_v_version_provenance_parent_id_idx" ON "_places_v_version_provenance" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "task_runs_key_idx" ON "task_runs" USING btree ("key");
  CREATE INDEX "task_runs_name_idx" ON "task_runs" USING btree ("name");
  CREATE INDEX "task_runs_status_idx" ON "task_runs" USING btree ("status");
  CREATE INDEX "task_runs_started_at_idx" ON "task_runs" USING btree ("started_at");
  CREATE INDEX "task_runs_updated_at_idx" ON "task_runs" USING btree ("updated_at");
  CREATE INDEX "task_runs_created_at_idx" ON "task_runs" USING btree ("created_at");
  CREATE UNIQUE INDEX "email_deliveries_idempotency_key_idx" ON "email_deliveries" USING btree ("idempotency_key");
  CREATE INDEX "email_deliveries_recipient_hash_idx" ON "email_deliveries" USING btree ("recipient_hash");
  CREATE INDEX "email_deliveries_provider_id_idx" ON "email_deliveries" USING btree ("provider_id");
  CREATE INDEX "email_deliveries_status_idx" ON "email_deliveries" USING btree ("status");
  CREATE INDEX "email_deliveries_updated_at_idx" ON "email_deliveries" USING btree ("updated_at");
  CREATE INDEX "email_deliveries_created_at_idx" ON "email_deliveries" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_task_runs_fk" FOREIGN KEY ("task_runs_id") REFERENCES "public"."task_runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_email_deliveries_fk" FOREIGN KEY ("email_deliveries_id") REFERENCES "public"."email_deliveries"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_task_runs_id_idx" ON "payload_locked_documents_rels" USING btree ("task_runs_id");
  CREATE INDEX "payload_locked_documents_rels_email_deliveries_id_idx" ON "payload_locked_documents_rels" USING btree ("email_deliveries_id");`)
  // A11 : garantie en base contre deux rendez-vous confirmés qui se chevauchent chez un même praticien,
  // y compris pour deux réservations simultanées (contrainte d’exclusion, vérifiée par Postgres dans la transaction).
  await db.execute(sql`
  CREATE EXTENSION IF NOT EXISTS btree_gist;
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_overlap"
    EXCLUDE USING gist ("practitioner_id" WITH =, tstzrange("start", "end", '[)') WITH &&) WHERE ("status" = 'confirmed');`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_no_overlap";`)
  await db.execute(sql`
   ALTER TABLE "places_provenance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_places_v_version_provenance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "task_runs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "email_deliveries" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "places_provenance" CASCADE;
  DROP TABLE "_places_v_version_provenance" CASCADE;
  DROP TABLE "task_runs" CASCADE;
  DROP TABLE "email_deliveries" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_task_runs_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_email_deliveries_fk";
  
  DROP INDEX "payload_locked_documents_rels_task_runs_id_idx";
  DROP INDEX "payload_locked_documents_rels_email_deliveries_id_idx";
  ALTER TABLE "places" DROP COLUMN "next_verification_at";
  ALTER TABLE "_places_v" DROP COLUMN "version_next_verification_at";
  ALTER TABLE "error_logs" DROP COLUMN "last_alert_at";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "task_runs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "email_deliveries_id";
  DROP TYPE "public"."enum_places_provenance_method";
  DROP TYPE "public"."enum__places_v_version_provenance_method";
  DROP TYPE "public"."enum_task_runs_status";
  DROP TYPE "public"."enum_email_deliveries_status";`)
}
