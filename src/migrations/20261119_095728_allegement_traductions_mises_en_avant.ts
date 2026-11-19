import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_faqs_lang" AS ENUM('fr', 'en', 'ar');
  CREATE TYPE "public"."enum_moments_lang" AS ENUM('fr', 'en', 'ar');
  CREATE TYPE "public"."enum_translations_lang" AS ENUM('fr', 'en', 'ar');
  CREATE TYPE "public"."enum_translations_status" AS ENUM('auto', 'relue');
  CREATE TYPE "public"."enum_sponsorships_target_collection" AS ENUM('places', 'practitioners', 'providers', 'classifieds');
  CREATE TYPE "public"."enum_sponsorships_kind" AS ENUM('a-la-une', 'remontee', 'partenaire');
  CREATE TYPE "public"."enum_sponsorships_status" AS ENUM('demande', 'active', 'terminee', 'refusee');
  ALTER TYPE "public"."enum_ai_usage_feature" ADD VALUE 'translate';
  ALTER TYPE "public"."enum_ai_usage_feature" ADD VALUE 'alt-text';
  ALTER TYPE "public"."enum_ai_usage_feature" ADD VALUE 'channel';
  CREATE TABLE "faqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"scope" varchar NOT NULL,
  	"lang" "enum_faqs_lang" DEFAULT 'fr' NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL,
  	"order" numeric DEFAULT 100,
  	"published" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "moments_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "moments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"lang" "enum_moments_lang" DEFAULT 'fr' NOT NULL,
  	"summary" varchar,
  	"body" jsonb,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"published" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "translations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"collection" varchar NOT NULL,
  	"doc_id" varchar NOT NULL,
  	"field" varchar NOT NULL,
  	"lang" "enum_translations_lang" NOT NULL,
  	"text" varchar,
  	"source_hash" varchar,
  	"status" "enum_translations_status" DEFAULT 'auto' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sponsorships" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"target_collection" "enum_sponsorships_target_collection" NOT NULL,
  	"target_id" varchar NOT NULL,
  	"kind" "enum_sponsorships_kind" NOT NULL,
  	"wilaya" varchar,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"status" "enum_sponsorships_status" DEFAULT 'demande' NOT NULL,
  	"payment_note" varchar,
  	"requested_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "whatsapp_phone" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "faqs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "moments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "translations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "sponsorships_id" integer;
  ALTER TABLE "moments_links" ADD CONSTRAINT "moments_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."moments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_requested_by_id_members_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "faqs_scope_idx" ON "faqs" USING btree ("scope");
  CREATE INDEX "faqs_published_idx" ON "faqs" USING btree ("published");
  CREATE INDEX "faqs_updated_at_idx" ON "faqs" USING btree ("updated_at");
  CREATE INDEX "faqs_created_at_idx" ON "faqs" USING btree ("created_at");
  CREATE INDEX "moments_links_order_idx" ON "moments_links" USING btree ("_order");
  CREATE INDEX "moments_links_parent_id_idx" ON "moments_links" USING btree ("_parent_id");
  CREATE INDEX "moments_slug_idx" ON "moments" USING btree ("slug");
  CREATE INDEX "moments_published_idx" ON "moments" USING btree ("published");
  CREATE INDEX "moments_updated_at_idx" ON "moments" USING btree ("updated_at");
  CREATE INDEX "moments_created_at_idx" ON "moments" USING btree ("created_at");
  CREATE INDEX "translations_collection_idx" ON "translations" USING btree ("collection");
  CREATE INDEX "translations_doc_id_idx" ON "translations" USING btree ("doc_id");
  CREATE INDEX "translations_updated_at_idx" ON "translations" USING btree ("updated_at");
  CREATE INDEX "translations_created_at_idx" ON "translations" USING btree ("created_at");
  CREATE UNIQUE INDEX "collection_docId_field_lang_idx" ON "translations" USING btree ("collection","doc_id","field","lang");
  CREATE INDEX "sponsorships_target_id_idx" ON "sponsorships" USING btree ("target_id");
  CREATE INDEX "sponsorships_status_idx" ON "sponsorships" USING btree ("status");
  CREATE INDEX "sponsorships_requested_by_idx" ON "sponsorships" USING btree ("requested_by_id");
  CREATE INDEX "sponsorships_updated_at_idx" ON "sponsorships" USING btree ("updated_at");
  CREATE INDEX "sponsorships_created_at_idx" ON "sponsorships" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_moments_fk" FOREIGN KEY ("moments_id") REFERENCES "public"."moments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_translations_fk" FOREIGN KEY ("translations_id") REFERENCES "public"."translations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sponsorships_fk" FOREIGN KEY ("sponsorships_id") REFERENCES "public"."sponsorships"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "users_whatsapp_phone_idx" ON "users" USING btree ("whatsapp_phone");
  CREATE INDEX "payload_locked_documents_rels_faqs_id_idx" ON "payload_locked_documents_rels" USING btree ("faqs_id");
  CREATE INDEX "payload_locked_documents_rels_moments_id_idx" ON "payload_locked_documents_rels" USING btree ("moments_id");
  CREATE INDEX "payload_locked_documents_rels_translations_id_idx" ON "payload_locked_documents_rels" USING btree ("translations_id");
  CREATE INDEX "payload_locked_documents_rels_sponsorships_id_idx" ON "payload_locked_documents_rels" USING btree ("sponsorships_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Écrit à la main (le « down » généré échouait : DROP TABLE … CASCADE retire déjà les contraintes) ; idempotent.
  // Les valeurs translate, alt-text, channel restent dans enum_ai_usage_feature : Postgres ne retire pas une valeur
  // d’enum sans réécrire la colonne, et des lignes de consommation peuvent déjà les porter (aucune donnée perdue).
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_faqs_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_moments_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_translations_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_sponsorships_fk";
  DROP INDEX IF EXISTS "users_whatsapp_phone_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_faqs_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_moments_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_translations_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_sponsorships_id_idx";
  ALTER TABLE "users" DROP COLUMN IF EXISTS "whatsapp_phone";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "faqs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "moments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "translations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "sponsorships_id";
  DROP TABLE IF EXISTS "faqs" CASCADE;
  DROP TABLE IF EXISTS "moments_links" CASCADE;
  DROP TABLE IF EXISTS "moments" CASCADE;
  DROP TABLE IF EXISTS "translations" CASCADE;
  DROP TABLE IF EXISTS "sponsorships" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_faqs_lang";
  DROP TYPE IF EXISTS "public"."enum_moments_lang";
  DROP TYPE IF EXISTS "public"."enum_translations_lang";
  DROP TYPE IF EXISTS "public"."enum_translations_status";
  DROP TYPE IF EXISTS "public"."enum_sponsorships_target_collection";
  DROP TYPE IF EXISTS "public"."enum_sponsorships_kind";
  DROP TYPE IF EXISTS "public"."enum_sponsorships_status";`)
}
