import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_places_languages" AS ENUM('ar', 'kab', 'fr', 'en', 'es', 'it', 'de', 'tr');
  CREATE TYPE "public"."enum__places_v_version_languages" AS ENUM('ar', 'kab', 'fr', 'en', 'es', 'it', 'de', 'tr');
  CREATE TABLE "places_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_places_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_places_v_version_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__places_v_version_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "practitioners_languages" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_practitioners_languages";
  CREATE TYPE "public"."enum_practitioners_languages" AS ENUM('ar', 'kab', 'fr', 'en', 'es', 'it', 'de', 'tr');
  ALTER TABLE "practitioners_languages" ALTER COLUMN "value" SET DATA TYPE "public"."enum_practitioners_languages" USING "value"::"public"."enum_practitioners_languages";
  ALTER TABLE "practitioners" ADD COLUMN "demo" boolean DEFAULT false;
  ALTER TABLE "places_languages" ADD CONSTRAINT "places_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v_version_languages" ADD CONSTRAINT "_places_v_version_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_places_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "places_languages_order_idx" ON "places_languages" USING btree ("order");
  CREATE INDEX "places_languages_parent_idx" ON "places_languages" USING btree ("parent_id");
  CREATE INDEX "_places_v_version_languages_order_idx" ON "_places_v_version_languages" USING btree ("order");
  CREATE INDEX "_places_v_version_languages_parent_idx" ON "_places_v_version_languages" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "places_languages" CASCADE;
  DROP TABLE "_places_v_version_languages" CASCADE;
  ALTER TABLE "practitioners_languages" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_practitioners_languages";
  CREATE TYPE "public"."enum_practitioners_languages" AS ENUM('ar', 'fr', 'kab', 'en');
  ALTER TABLE "practitioners_languages" ALTER COLUMN "value" SET DATA TYPE "public"."enum_practitioners_languages" USING "value"::"public"."enum_practitioners_languages";
  ALTER TABLE "practitioners" DROP COLUMN "demo";
  DROP TYPE "public"."enum_places_languages";
  DROP TYPE "public"."enum__places_v_version_languages";`)
}
