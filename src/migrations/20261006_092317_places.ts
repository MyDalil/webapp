import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_places_criteria_result" AS ENUM('pending', 'ok', 'partial', 'ko', 'na');
  CREATE TYPE "public"."enum_places_sector" AS ENUM('restaurants-gastronomie', 'education-formation', 'sante-soins', 'bien-etre-sport', 'logement-immobilier', 'hebergement-sejours', 'culture-nature-loisirs', 'mosquees-priere', 'commerces-achats', 'transports-mobilite', 'maison-travaux', 'droit-finance-conseil', 'administrations-services-publics');
  CREATE TYPE "public"."enum_places_wilaya" AS ENUM('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69');
  CREATE TYPE "public"."enum_places_verification" AS ENUM('spotted', 'checking', 'verified', 'labelled');
  CREATE TYPE "public"."enum_places_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__places_v_version_criteria_result" AS ENUM('pending', 'ok', 'partial', 'ko', 'na');
  CREATE TYPE "public"."enum__places_v_version_sector" AS ENUM('restaurants-gastronomie', 'education-formation', 'sante-soins', 'bien-etre-sport', 'logement-immobilier', 'hebergement-sejours', 'culture-nature-loisirs', 'mosquees-priere', 'commerces-achats', 'transports-mobilite', 'maison-travaux', 'droit-finance-conseil', 'administrations-services-publics');
  CREATE TYPE "public"."enum__places_v_version_wilaya" AS ENUM('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69');
  CREATE TYPE "public"."enum__places_v_version_verification" AS ENUM('spotted', 'checking', 'verified', 'labelled');
  CREATE TYPE "public"."enum__places_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "places_hours" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"days" varchar,
  	"time" varchar
  );
  
  CREATE TABLE "places_criteria" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"criterion" varchar,
  	"result" "enum_places_criteria_result" DEFAULT 'pending',
  	"note" varchar
  );
  
  CREATE TABLE "places_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "places" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"sector" "enum_places_sector",
  	"category" varchar,
  	"intro" varchar,
  	"wilaya" "enum_places_wilaya",
  	"city" varchar,
  	"place" varchar,
  	"address" varchar,
  	"lat" numeric,
  	"lng" numeric,
  	"phone" varchar,
  	"whatsapp" varchar,
  	"email" varchar,
  	"website" varchar,
  	"instagram" varchar,
  	"facebook" varchar,
  	"show_contacts" boolean DEFAULT false,
  	"verification" "enum_places_verification" DEFAULT 'spotted',
  	"verified_at" timestamp(3) with time zone,
  	"verified_by" varchar,
  	"internal_note" varchar,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_places_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "places_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_places_v_version_hours" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"days" varchar,
  	"time" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_places_v_version_criteria" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"criterion" varchar,
  	"result" "enum__places_v_version_criteria_result" DEFAULT 'pending',
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_places_v_version_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_places_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_sector" "enum__places_v_version_sector",
  	"version_category" varchar,
  	"version_intro" varchar,
  	"version_wilaya" "enum__places_v_version_wilaya",
  	"version_city" varchar,
  	"version_place" varchar,
  	"version_address" varchar,
  	"version_lat" numeric,
  	"version_lng" numeric,
  	"version_phone" varchar,
  	"version_whatsapp" varchar,
  	"version_email" varchar,
  	"version_website" varchar,
  	"version_instagram" varchar,
  	"version_facebook" varchar,
  	"version_show_contacts" boolean DEFAULT false,
  	"version_verification" "enum__places_v_version_verification" DEFAULT 'spotted',
  	"version_verified_at" timestamp(3) with time zone,
  	"version_verified_by" varchar,
  	"version_internal_note" varchar,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__places_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_places_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"credit" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_cover_url" varchar,
  	"sizes_cover_width" numeric,
  	"sizes_cover_height" numeric,
  	"sizes_cover_mime_type" varchar,
  	"sizes_cover_filesize" numeric,
  	"sizes_cover_filename" varchar
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "places_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "places_hours" ADD CONSTRAINT "places_hours_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "places_criteria" ADD CONSTRAINT "places_criteria_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "places_sources" ADD CONSTRAINT "places_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "places_rels" ADD CONSTRAINT "places_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "places_rels" ADD CONSTRAINT "places_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v_version_hours" ADD CONSTRAINT "_places_v_version_hours_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_places_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v_version_criteria" ADD CONSTRAINT "_places_v_version_criteria_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_places_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v_version_sources" ADD CONSTRAINT "_places_v_version_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_places_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v" ADD CONSTRAINT "_places_v_parent_id_places_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_places_v_rels" ADD CONSTRAINT "_places_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_places_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v_rels" ADD CONSTRAINT "_places_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "places_hours_order_idx" ON "places_hours" USING btree ("_order");
  CREATE INDEX "places_hours_parent_id_idx" ON "places_hours" USING btree ("_parent_id");
  CREATE INDEX "places_criteria_order_idx" ON "places_criteria" USING btree ("_order");
  CREATE INDEX "places_criteria_parent_id_idx" ON "places_criteria" USING btree ("_parent_id");
  CREATE INDEX "places_sources_order_idx" ON "places_sources" USING btree ("_order");
  CREATE INDEX "places_sources_parent_id_idx" ON "places_sources" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "places_slug_idx" ON "places" USING btree ("slug");
  CREATE INDEX "places_updated_at_idx" ON "places" USING btree ("updated_at");
  CREATE INDEX "places_created_at_idx" ON "places" USING btree ("created_at");
  CREATE INDEX "places__status_idx" ON "places" USING btree ("_status");
  CREATE INDEX "places_rels_order_idx" ON "places_rels" USING btree ("order");
  CREATE INDEX "places_rels_parent_idx" ON "places_rels" USING btree ("parent_id");
  CREATE INDEX "places_rels_path_idx" ON "places_rels" USING btree ("path");
  CREATE INDEX "places_rels_media_id_idx" ON "places_rels" USING btree ("media_id");
  CREATE INDEX "_places_v_version_hours_order_idx" ON "_places_v_version_hours" USING btree ("_order");
  CREATE INDEX "_places_v_version_hours_parent_id_idx" ON "_places_v_version_hours" USING btree ("_parent_id");
  CREATE INDEX "_places_v_version_criteria_order_idx" ON "_places_v_version_criteria" USING btree ("_order");
  CREATE INDEX "_places_v_version_criteria_parent_id_idx" ON "_places_v_version_criteria" USING btree ("_parent_id");
  CREATE INDEX "_places_v_version_sources_order_idx" ON "_places_v_version_sources" USING btree ("_order");
  CREATE INDEX "_places_v_version_sources_parent_id_idx" ON "_places_v_version_sources" USING btree ("_parent_id");
  CREATE INDEX "_places_v_parent_idx" ON "_places_v" USING btree ("parent_id");
  CREATE INDEX "_places_v_version_version_slug_idx" ON "_places_v" USING btree ("version_slug");
  CREATE INDEX "_places_v_version_version_updated_at_idx" ON "_places_v" USING btree ("version_updated_at");
  CREATE INDEX "_places_v_version_version_created_at_idx" ON "_places_v" USING btree ("version_created_at");
  CREATE INDEX "_places_v_version_version__status_idx" ON "_places_v" USING btree ("version__status");
  CREATE INDEX "_places_v_created_at_idx" ON "_places_v" USING btree ("created_at");
  CREATE INDEX "_places_v_updated_at_idx" ON "_places_v" USING btree ("updated_at");
  CREATE INDEX "_places_v_latest_idx" ON "_places_v" USING btree ("latest");
  CREATE INDEX "_places_v_rels_order_idx" ON "_places_v_rels" USING btree ("order");
  CREATE INDEX "_places_v_rels_parent_idx" ON "_places_v_rels" USING btree ("parent_id");
  CREATE INDEX "_places_v_rels_path_idx" ON "_places_v_rels" USING btree ("path");
  CREATE INDEX "_places_v_rels_media_id_idx" ON "_places_v_rels" USING btree ("media_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_cover_sizes_cover_filename_idx" ON "media" USING btree ("sizes_cover_filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_places_fk" FOREIGN KEY ("places_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_places_id_idx" ON "payload_locked_documents_rels" USING btree ("places_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "places_hours" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "places_criteria" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "places_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "places" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "places_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_places_v_version_hours" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_places_v_version_criteria" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_places_v_version_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_places_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_places_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "media" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "places_hours" CASCADE;
  DROP TABLE "places_criteria" CASCADE;
  DROP TABLE "places_sources" CASCADE;
  DROP TABLE "places" CASCADE;
  DROP TABLE "places_rels" CASCADE;
  DROP TABLE "_places_v_version_hours" CASCADE;
  DROP TABLE "_places_v_version_criteria" CASCADE;
  DROP TABLE "_places_v_version_sources" CASCADE;
  DROP TABLE "_places_v" CASCADE;
  DROP TABLE "_places_v_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_places_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_fk";
  
  DROP INDEX "payload_locked_documents_rels_places_id_idx";
  DROP INDEX "payload_locked_documents_rels_media_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "places_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "media_id";
  DROP TYPE "public"."enum_places_criteria_result";
  DROP TYPE "public"."enum_places_sector";
  DROP TYPE "public"."enum_places_wilaya";
  DROP TYPE "public"."enum_places_verification";
  DROP TYPE "public"."enum_places_status";
  DROP TYPE "public"."enum__places_v_version_criteria_result";
  DROP TYPE "public"."enum__places_v_version_sector";
  DROP TYPE "public"."enum__places_v_version_wilaya";
  DROP TYPE "public"."enum__places_v_version_verification";
  DROP TYPE "public"."enum__places_v_version_status";`)
}
