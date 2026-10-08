import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_places_source_provider" AS ENUM('dalil', 'wikidata', 'osm', 'pro');
  CREATE TYPE "public"."enum__places_v_version_source_provider" AS ENUM('dalil', 'wikidata', 'osm', 'pro');
  CREATE TABLE "places_external_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"author" varchar,
  	"license" varchar,
  	"license_url" varchar,
  	"page" varchar,
  	"width" numeric,
  	"height" numeric
  );
  
  CREATE TABLE "_places_v_version_external_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"author" varchar,
  	"license" varchar,
  	"license_url" varchar,
  	"page" varchar,
  	"width" numeric,
  	"height" numeric,
  	"_uuid" varchar
  );
  
  ALTER TABLE "places" ADD COLUMN "name_ar" varchar;
  ALTER TABLE "places" ADD COLUMN "name_en" varchar;
  ALTER TABLE "places" ADD COLUMN "heritage" varchar;
  ALTER TABLE "places" ADD COLUMN "inception" varchar;
  ALTER TABLE "places" ADD COLUMN "wikipedia" varchar;
  ALTER TABLE "places" ADD COLUMN "score" numeric;
  ALTER TABLE "places" ADD COLUMN "source_provider" "enum_places_source_provider" DEFAULT 'dalil';
  ALTER TABLE "places" ADD COLUMN "source_external_id" varchar;
  ALTER TABLE "places" ADD COLUMN "source_url" varchar;
  ALTER TABLE "places" ADD COLUMN "source_notoriety" numeric;
  ALTER TABLE "places" ADD COLUMN "source_notes" varchar;
  ALTER TABLE "_places_v" ADD COLUMN "version_name_ar" varchar;
  ALTER TABLE "_places_v" ADD COLUMN "version_name_en" varchar;
  ALTER TABLE "_places_v" ADD COLUMN "version_heritage" varchar;
  ALTER TABLE "_places_v" ADD COLUMN "version_inception" varchar;
  ALTER TABLE "_places_v" ADD COLUMN "version_wikipedia" varchar;
  ALTER TABLE "_places_v" ADD COLUMN "version_score" numeric;
  ALTER TABLE "_places_v" ADD COLUMN "version_source_provider" "enum__places_v_version_source_provider" DEFAULT 'dalil';
  ALTER TABLE "_places_v" ADD COLUMN "version_source_external_id" varchar;
  ALTER TABLE "_places_v" ADD COLUMN "version_source_url" varchar;
  ALTER TABLE "_places_v" ADD COLUMN "version_source_notoriety" numeric;
  ALTER TABLE "_places_v" ADD COLUMN "version_source_notes" varchar;
  ALTER TABLE "places_external_photos" ADD CONSTRAINT "places_external_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v_version_external_photos" ADD CONSTRAINT "_places_v_version_external_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_places_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "places_external_photos_order_idx" ON "places_external_photos" USING btree ("_order");
  CREATE INDEX "places_external_photos_parent_id_idx" ON "places_external_photos" USING btree ("_parent_id");
  CREATE INDEX "_places_v_version_external_photos_order_idx" ON "_places_v_version_external_photos" USING btree ("_order");
  CREATE INDEX "_places_v_version_external_photos_parent_id_idx" ON "_places_v_version_external_photos" USING btree ("_parent_id");
  CREATE INDEX "places_score_idx" ON "places" USING btree ("score");
  CREATE INDEX "places_source_source_external_id_idx" ON "places" USING btree ("source_external_id");
  CREATE INDEX "_places_v_version_version_score_idx" ON "_places_v" USING btree ("version_score");
  CREATE INDEX "_places_v_version_source_version_source_external_id_idx" ON "_places_v" USING btree ("version_source_external_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "places_external_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_places_v_version_external_photos" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "places_external_photos" CASCADE;
  DROP TABLE "_places_v_version_external_photos" CASCADE;
  DROP INDEX "places_score_idx";
  DROP INDEX "places_source_source_external_id_idx";
  DROP INDEX "_places_v_version_version_score_idx";
  DROP INDEX "_places_v_version_source_version_source_external_id_idx";
  ALTER TABLE "places" DROP COLUMN "name_ar";
  ALTER TABLE "places" DROP COLUMN "name_en";
  ALTER TABLE "places" DROP COLUMN "heritage";
  ALTER TABLE "places" DROP COLUMN "inception";
  ALTER TABLE "places" DROP COLUMN "wikipedia";
  ALTER TABLE "places" DROP COLUMN "score";
  ALTER TABLE "places" DROP COLUMN "source_provider";
  ALTER TABLE "places" DROP COLUMN "source_external_id";
  ALTER TABLE "places" DROP COLUMN "source_url";
  ALTER TABLE "places" DROP COLUMN "source_notoriety";
  ALTER TABLE "places" DROP COLUMN "source_notes";
  ALTER TABLE "_places_v" DROP COLUMN "version_name_ar";
  ALTER TABLE "_places_v" DROP COLUMN "version_name_en";
  ALTER TABLE "_places_v" DROP COLUMN "version_heritage";
  ALTER TABLE "_places_v" DROP COLUMN "version_inception";
  ALTER TABLE "_places_v" DROP COLUMN "version_wikipedia";
  ALTER TABLE "_places_v" DROP COLUMN "version_score";
  ALTER TABLE "_places_v" DROP COLUMN "version_source_provider";
  ALTER TABLE "_places_v" DROP COLUMN "version_source_external_id";
  ALTER TABLE "_places_v" DROP COLUMN "version_source_url";
  ALTER TABLE "_places_v" DROP COLUMN "version_source_notoriety";
  ALTER TABLE "_places_v" DROP COLUMN "version_source_notes";
  DROP TYPE "public"."enum_places_source_provider";
  DROP TYPE "public"."enum__places_v_version_source_provider";`)
}
