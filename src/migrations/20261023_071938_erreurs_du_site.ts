import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "error_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"fingerprint" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"route" varchar,
  	"path" varchar,
  	"method" varchar,
  	"route_type" varchar,
  	"count" numeric DEFAULT 1,
  	"first_seen" timestamp(3) with time zone,
  	"last_seen" timestamp(3) with time zone,
  	"resolved" boolean DEFAULT false,
  	"digest" varchar,
  	"stack" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "error_logs_id" integer;
  CREATE UNIQUE INDEX "error_logs_fingerprint_idx" ON "error_logs" USING btree ("fingerprint");
  CREATE INDEX "error_logs_last_seen_idx" ON "error_logs" USING btree ("last_seen");
  CREATE INDEX "error_logs_updated_at_idx" ON "error_logs" USING btree ("updated_at");
  CREATE INDEX "error_logs_created_at_idx" ON "error_logs" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_error_logs_fk" FOREIGN KEY ("error_logs_id") REFERENCES "public"."error_logs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_error_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("error_logs_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "error_logs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "error_logs" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_error_logs_fk";
  
  DROP INDEX "payload_locked_documents_rels_error_logs_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "error_logs_id";`)
}
