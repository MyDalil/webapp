import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_demandes_accompagnement_status" AS ENUM('attente', 'a-contacter', 'en-cours', 'terminee', 'annulee');
  CREATE TYPE "public"."enum_accompagnement_mode" AS ENUM('cache', 'liste-attente', 'ouvert');
  ALTER TYPE "public"."enum_users_role" ADD VALUE 'conseiller';
  CREATE TABLE "packs_includes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL
  );
  
  CREATE TABLE "packs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"demarche" varchar NOT NULL,
  	"guide" varchar NOT NULL,
  	"summary" varchar NOT NULL,
  	"price_eur" numeric,
  	"price_da" numeric,
  	"active" boolean DEFAULT true,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "demandes_accompagnement" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"pack_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"country" varchar,
  	"message" varchar,
  	"status" "enum_demandes_accompagnement_status" DEFAULT 'attente' NOT NULL,
  	"advisor_id" integer,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "accompagnement" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"mode" "enum_accompagnement_mode" DEFAULT 'cache' NOT NULL,
  	"payment_enabled" boolean DEFAULT false,
  	"whatsapp" varchar,
  	"notify_email" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "packs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "demandes_accompagnement_id" integer;
  ALTER TABLE "packs_includes" ADD CONSTRAINT "packs_includes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "demandes_accompagnement" ADD CONSTRAINT "demandes_accompagnement_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "demandes_accompagnement" ADD CONSTRAINT "demandes_accompagnement_advisor_id_users_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "packs_includes_order_idx" ON "packs_includes" USING btree ("_order");
  CREATE INDEX "packs_includes_parent_id_idx" ON "packs_includes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "packs_slug_idx" ON "packs" USING btree ("slug");
  CREATE INDEX "packs_guide_idx" ON "packs" USING btree ("guide");
  CREATE INDEX "packs_updated_at_idx" ON "packs" USING btree ("updated_at");
  CREATE INDEX "packs_created_at_idx" ON "packs" USING btree ("created_at");
  CREATE INDEX "demandes_accompagnement_pack_idx" ON "demandes_accompagnement" USING btree ("pack_id");
  CREATE INDEX "demandes_accompagnement_status_idx" ON "demandes_accompagnement" USING btree ("status");
  CREATE INDEX "demandes_accompagnement_advisor_idx" ON "demandes_accompagnement" USING btree ("advisor_id");
  CREATE INDEX "demandes_accompagnement_updated_at_idx" ON "demandes_accompagnement" USING btree ("updated_at");
  CREATE INDEX "demandes_accompagnement_created_at_idx" ON "demandes_accompagnement" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_packs_fk" FOREIGN KEY ("packs_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_demandes_accompagnement_fk" FOREIGN KEY ("demandes_accompagnement_id") REFERENCES "public"."demandes_accompagnement"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_packs_id_idx" ON "payload_locked_documents_rels" USING btree ("packs_id");
  CREATE INDEX "payload_locked_documents_rels_demandes_accompagnement_id_idx" ON "payload_locked_documents_rels" USING btree ("demandes_accompagnement_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "packs_includes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "packs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "demandes_accompagnement" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "accompagnement" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "packs_includes" CASCADE;
  DROP TABLE "packs" CASCADE;
  DROP TABLE "demandes_accompagnement" CASCADE;
  DROP TABLE "accompagnement" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_packs_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_demandes_accompagnement_fk";
  
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::text;
  DROP TYPE "public"."enum_users_role";
  CREATE TYPE "public"."enum_users_role" AS ENUM('patron', 'admin', 'editor');
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::"public"."enum_users_role";
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."enum_users_role" USING "role"::"public"."enum_users_role";
  DROP INDEX "payload_locked_documents_rels_packs_id_idx";
  DROP INDEX "payload_locked_documents_rels_demandes_accompagnement_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "packs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "demandes_accompagnement_id";
  DROP TYPE "public"."enum_demandes_accompagnement_status";
  DROP TYPE "public"."enum_accompagnement_mode";`)
}
