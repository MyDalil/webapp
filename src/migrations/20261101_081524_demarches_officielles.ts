import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_procedures_audience" AS ENUM('residents', 'diaspora', 'etrangers', 'entreprises');
  CREATE TYPE "public"."enum_procedures_theme" AS ENUM('identite', 'etat-civil', 'consulaire-diaspora', 'nationalite-justice', 'voyage-circulation', 'entreprise', 'fiscalite', 'social-emploi', 'logement-urbanisme', 'vehicules-permis', 'education-diplomes', 'etrangers-en-algerie', 'associations', 'sante', 'factures-services');
  CREATE TYPE "public"."enum_procedures_status" AS ENUM('published', 'draft', 'retired');
  CREATE TYPE "public"."enum_platforms_status" AS ENUM('published', 'draft', 'retired');
  CREATE TYPE "public"."enum_representations_kind" AS ENUM('ambassade', 'consulat-general', 'consulat');
  CREATE TYPE "public"."enum_representations_continent" AS ENUM('Europe', 'Afrique', 'Amérique du Nord', 'Amérique latine', 'Moyen-Orient', 'Asie', 'Océanie');
  CREATE TYPE "public"."enum_representations_status" AS ENUM('published', 'draft', 'retired');
  CREATE TABLE "procedures_audience" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_procedures_audience",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "procedures_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "procedures_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "procedures_forms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "procedures_laws" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "procedures_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"checked" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "procedures" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"theme" "enum_procedures_theme" NOT NULL,
  	"summary" varchar NOT NULL,
  	"online" boolean DEFAULT false,
  	"online_url" varchar,
  	"platform" varchar,
  	"cost" varchar,
  	"delay" varchar,
  	"where" varchar,
  	"status" "enum_procedures_status" DEFAULT 'published' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "platforms_services" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "platforms_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"checked" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "platforms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"organisme" varchar,
  	"order" numeric DEFAULT 100,
  	"status" "enum_platforms_status" DEFAULT 'published' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "representations_online_services" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "representations_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"checked" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "representations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"country" varchar NOT NULL,
  	"city" varchar NOT NULL,
  	"kind" "enum_representations_kind" NOT NULL,
  	"continent" "enum_representations_continent",
  	"address" varchar,
  	"phone" varchar,
  	"email" varchar,
  	"website" varchar,
  	"jurisdiction" varchar,
  	"status" "enum_representations_status" DEFAULT 'published' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "procedures_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "platforms_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "representations_id" integer;
  ALTER TABLE "procedures_audience" ADD CONSTRAINT "procedures_audience_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."procedures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "procedures_steps" ADD CONSTRAINT "procedures_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."procedures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "procedures_documents" ADD CONSTRAINT "procedures_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."procedures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "procedures_forms" ADD CONSTRAINT "procedures_forms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."procedures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "procedures_laws" ADD CONSTRAINT "procedures_laws_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."procedures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "procedures_sources" ADD CONSTRAINT "procedures_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."procedures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "platforms_services" ADD CONSTRAINT "platforms_services_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."platforms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "platforms_sources" ADD CONSTRAINT "platforms_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."platforms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "representations_online_services" ADD CONSTRAINT "representations_online_services_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."representations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "representations_sources" ADD CONSTRAINT "representations_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."representations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "procedures_audience_order_idx" ON "procedures_audience" USING btree ("order");
  CREATE INDEX "procedures_audience_parent_idx" ON "procedures_audience" USING btree ("parent_id");
  CREATE INDEX "procedures_steps_order_idx" ON "procedures_steps" USING btree ("_order");
  CREATE INDEX "procedures_steps_parent_id_idx" ON "procedures_steps" USING btree ("_parent_id");
  CREATE INDEX "procedures_documents_order_idx" ON "procedures_documents" USING btree ("_order");
  CREATE INDEX "procedures_documents_parent_id_idx" ON "procedures_documents" USING btree ("_parent_id");
  CREATE INDEX "procedures_forms_order_idx" ON "procedures_forms" USING btree ("_order");
  CREATE INDEX "procedures_forms_parent_id_idx" ON "procedures_forms" USING btree ("_parent_id");
  CREATE INDEX "procedures_laws_order_idx" ON "procedures_laws" USING btree ("_order");
  CREATE INDEX "procedures_laws_parent_id_idx" ON "procedures_laws" USING btree ("_parent_id");
  CREATE INDEX "procedures_sources_order_idx" ON "procedures_sources" USING btree ("_order");
  CREATE INDEX "procedures_sources_parent_id_idx" ON "procedures_sources" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "procedures_slug_idx" ON "procedures" USING btree ("slug");
  CREATE INDEX "procedures_theme_idx" ON "procedures" USING btree ("theme");
  CREATE INDEX "procedures_updated_at_idx" ON "procedures" USING btree ("updated_at");
  CREATE INDEX "procedures_created_at_idx" ON "procedures" USING btree ("created_at");
  CREATE INDEX "platforms_services_order_idx" ON "platforms_services" USING btree ("_order");
  CREATE INDEX "platforms_services_parent_id_idx" ON "platforms_services" USING btree ("_parent_id");
  CREATE INDEX "platforms_sources_order_idx" ON "platforms_sources" USING btree ("_order");
  CREATE INDEX "platforms_sources_parent_id_idx" ON "platforms_sources" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "platforms_slug_idx" ON "platforms" USING btree ("slug");
  CREATE INDEX "platforms_updated_at_idx" ON "platforms" USING btree ("updated_at");
  CREATE INDEX "platforms_created_at_idx" ON "platforms" USING btree ("created_at");
  CREATE INDEX "representations_online_services_order_idx" ON "representations_online_services" USING btree ("_order");
  CREATE INDEX "representations_online_services_parent_id_idx" ON "representations_online_services" USING btree ("_parent_id");
  CREATE INDEX "representations_sources_order_idx" ON "representations_sources" USING btree ("_order");
  CREATE INDEX "representations_sources_parent_id_idx" ON "representations_sources" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "representations_slug_idx" ON "representations" USING btree ("slug");
  CREATE INDEX "representations_country_idx" ON "representations" USING btree ("country");
  CREATE INDEX "representations_updated_at_idx" ON "representations" USING btree ("updated_at");
  CREATE INDEX "representations_created_at_idx" ON "representations" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_procedures_fk" FOREIGN KEY ("procedures_id") REFERENCES "public"."procedures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_platforms_fk" FOREIGN KEY ("platforms_id") REFERENCES "public"."platforms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_representations_fk" FOREIGN KEY ("representations_id") REFERENCES "public"."representations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_procedures_id_idx" ON "payload_locked_documents_rels" USING btree ("procedures_id");
  CREATE INDEX "payload_locked_documents_rels_platforms_id_idx" ON "payload_locked_documents_rels" USING btree ("platforms_id");
  CREATE INDEX "payload_locked_documents_rels_representations_id_idx" ON "payload_locked_documents_rels" USING btree ("representations_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "procedures_audience" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "procedures_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "procedures_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "procedures_forms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "procedures_laws" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "procedures_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "procedures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "platforms_services" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "platforms_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "platforms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "representations_online_services" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "representations_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "representations" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "procedures_audience" CASCADE;
  DROP TABLE "procedures_steps" CASCADE;
  DROP TABLE "procedures_documents" CASCADE;
  DROP TABLE "procedures_forms" CASCADE;
  DROP TABLE "procedures_laws" CASCADE;
  DROP TABLE "procedures_sources" CASCADE;
  DROP TABLE "procedures" CASCADE;
  DROP TABLE "platforms_services" CASCADE;
  DROP TABLE "platforms_sources" CASCADE;
  DROP TABLE "platforms" CASCADE;
  DROP TABLE "representations_online_services" CASCADE;
  DROP TABLE "representations_sources" CASCADE;
  DROP TABLE "representations" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_procedures_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_platforms_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_representations_fk";
  
  DROP INDEX "payload_locked_documents_rels_procedures_id_idx";
  DROP INDEX "payload_locked_documents_rels_platforms_id_idx";
  DROP INDEX "payload_locked_documents_rels_representations_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "procedures_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "platforms_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "representations_id";
  DROP TYPE "public"."enum_procedures_audience";
  DROP TYPE "public"."enum_procedures_theme";
  DROP TYPE "public"."enum_procedures_status";
  DROP TYPE "public"."enum_platforms_status";
  DROP TYPE "public"."enum_representations_kind";
  DROP TYPE "public"."enum_representations_continent";
  DROP TYPE "public"."enum_representations_status";`)
}
