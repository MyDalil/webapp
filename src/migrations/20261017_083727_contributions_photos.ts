import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "contribution_photos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"submission_id" integer NOT NULL,
  	"author" varchar NOT NULL,
  	"license" varchar DEFAULT 'CC BY 4.0' NOT NULL,
  	"certified_at" timestamp(3) with time zone NOT NULL,
  	"filename" varchar,
  	"mimetype" varchar,
  	"size" numeric,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"data" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "places" ADD COLUMN "contributor" varchar;
  ALTER TABLE "_places_v" ADD COLUMN "version_contributor" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "contribution_photos_id" integer;
  ALTER TABLE "contribution_photos" ADD CONSTRAINT "contribution_photos_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "contribution_photos_submission_idx" ON "contribution_photos" USING btree ("submission_id");
  CREATE INDEX "contribution_photos_updated_at_idx" ON "contribution_photos" USING btree ("updated_at");
  CREATE INDEX "contribution_photos_created_at_idx" ON "contribution_photos" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contribution_photos_fk" FOREIGN KEY ("contribution_photos_id") REFERENCES "public"."contribution_photos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_contribution_photos_id_idx" ON "payload_locked_documents_rels" USING btree ("contribution_photos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "contribution_photos" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "contribution_photos" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_contribution_photos_fk";
  
  DROP INDEX "payload_locked_documents_rels_contribution_photos_id_idx";
  ALTER TABLE "places" DROP COLUMN "contributor";
  ALTER TABLE "_places_v" DROP COLUMN "version_contributor";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "contribution_photos_id";`)
}
