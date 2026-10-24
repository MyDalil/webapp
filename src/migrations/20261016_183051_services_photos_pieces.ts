import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_provider_documents_kind" AS ENUM('identity', 'legal', 'background');
  CREATE TYPE "public"."enum_media_moderation" AS ENUM('ok', 'to-check');
  CREATE TABLE "provider_reviews_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "provider_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"provider_id" integer NOT NULL,
  	"kind" "enum_provider_documents_kind" NOT NULL,
  	"filename" varchar,
  	"mimetype" varchar,
  	"size" numeric,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"data" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "media" ADD COLUMN "moderation" "enum_media_moderation" DEFAULT 'ok';
  ALTER TABLE "media" ADD COLUMN "uploaded_by_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "provider_documents_id" integer;
  ALTER TABLE "provider_reviews_rels" ADD CONSTRAINT "provider_reviews_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."provider_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "provider_reviews_rels" ADD CONSTRAINT "provider_reviews_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "provider_documents" ADD CONSTRAINT "provider_documents_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "provider_reviews_rels_order_idx" ON "provider_reviews_rels" USING btree ("order");
  CREATE INDEX "provider_reviews_rels_parent_idx" ON "provider_reviews_rels" USING btree ("parent_id");
  CREATE INDEX "provider_reviews_rels_path_idx" ON "provider_reviews_rels" USING btree ("path");
  CREATE INDEX "provider_reviews_rels_media_id_idx" ON "provider_reviews_rels" USING btree ("media_id");
  CREATE INDEX "provider_documents_provider_idx" ON "provider_documents" USING btree ("provider_id");
  CREATE INDEX "provider_documents_updated_at_idx" ON "provider_documents" USING btree ("updated_at");
  CREATE INDEX "provider_documents_created_at_idx" ON "provider_documents" USING btree ("created_at");
  ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_members_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_provider_documents_fk" FOREIGN KEY ("provider_documents_id") REFERENCES "public"."provider_documents"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_moderation_idx" ON "media" USING btree ("moderation");
  CREATE INDEX "media_uploaded_by_idx" ON "media" USING btree ("uploaded_by_id");
  CREATE INDEX "payload_locked_documents_rels_provider_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("provider_documents_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "provider_reviews_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "provider_documents" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "provider_reviews_rels" CASCADE;
  DROP TABLE "provider_documents" CASCADE;
  ALTER TABLE "media" DROP CONSTRAINT "media_uploaded_by_id_members_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_provider_documents_fk";
  
  DROP INDEX "media_moderation_idx";
  DROP INDEX "media_uploaded_by_idx";
  DROP INDEX "payload_locked_documents_rels_provider_documents_id_idx";
  ALTER TABLE "media" DROP COLUMN "moderation";
  ALTER TABLE "media" DROP COLUMN "uploaded_by_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "provider_documents_id";
  DROP TYPE "public"."enum_provider_documents_kind";
  DROP TYPE "public"."enum_media_moderation";`)
}
