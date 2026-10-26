import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_events_type" AS ENUM('culture', 'festival', 'exposition', 'sport', 'nature', 'gastronomie', 'atelier', 'religieux');
  CREATE TYPE "public"."enum_events_reliability" AS ENUM('confirmed', 'incomplete');
  CREATE TYPE "public"."enum_events_wilaya" AS ENUM('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69');
  CREATE TYPE "public"."enum_events_accessible" AS ENUM('yes', 'no', 'unknown');
  CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_version_type" AS ENUM('culture', 'festival', 'exposition', 'sport', 'nature', 'gastronomie', 'atelier', 'religieux');
  CREATE TYPE "public"."enum__events_v_version_reliability" AS ENUM('confirmed', 'incomplete');
  CREATE TYPE "public"."enum__events_v_version_wilaya" AS ENUM('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69');
  CREATE TYPE "public"."enum__events_v_version_accessible" AS ENUM('yes', 'no', 'unknown');
  CREATE TYPE "public"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"type" "enum_events_type",
  	"reliability" "enum_events_reliability" DEFAULT 'incomplete',
  	"intro" varchar,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"wilaya" "enum_events_wilaya",
  	"city" varchar,
  	"place_id" integer,
  	"address" varchar,
  	"free" boolean,
  	"price_min" numeric,
  	"price_note" varchar,
  	"family" boolean,
  	"accessible" "enum_events_accessible" DEFAULT 'unknown',
  	"booking_url" varchar,
  	"organizer" varchar,
  	"source_url" varchar,
  	"photo_id" integer,
  	"contributor" varchar,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_type" "enum__events_v_version_type",
  	"version_reliability" "enum__events_v_version_reliability" DEFAULT 'incomplete',
  	"version_intro" varchar,
  	"version_starts_at" timestamp(3) with time zone,
  	"version_ends_at" timestamp(3) with time zone,
  	"version_wilaya" "enum__events_v_version_wilaya",
  	"version_city" varchar,
  	"version_place_id" integer,
  	"version_address" varchar,
  	"version_free" boolean,
  	"version_price_min" numeric,
  	"version_price_note" varchar,
  	"version_family" boolean,
  	"version_accessible" "enum__events_v_version_accessible" DEFAULT 'unknown',
  	"version_booking_url" varchar,
  	"version_organizer" varchar,
  	"version_source_url" varchar,
  	"version_photo_id" integer,
  	"version_contributor" varchar,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "events_id" integer;
  ALTER TABLE "events" ADD CONSTRAINT "events_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_place_id_places_id_fk" FOREIGN KEY ("version_place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "events_place_idx" ON "events" USING btree ("place_id");
  CREATE INDEX "events_photo_idx" ON "events" USING btree ("photo_id");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events__status_idx" ON "events" USING btree ("_status");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_place_idx" ON "_events_v" USING btree ("version_place_id");
  CREATE INDEX "_events_v_version_version_photo_idx" ON "_events_v" USING btree ("version_photo_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_latest_idx" ON "_events_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_events_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "events" CASCADE;
  DROP TABLE "_events_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_events_fk";
  
  DROP INDEX "payload_locked_documents_rels_events_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "events_id";
  DROP TYPE "public"."enum_events_type";
  DROP TYPE "public"."enum_events_reliability";
  DROP TYPE "public"."enum_events_wilaya";
  DROP TYPE "public"."enum_events_accessible";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum__events_v_version_type";
  DROP TYPE "public"."enum__events_v_version_reliability";
  DROP TYPE "public"."enum__events_v_version_wilaya";
  DROP TYPE "public"."enum__events_v_version_accessible";
  DROP TYPE "public"."enum__events_v_version_status";`)
}
