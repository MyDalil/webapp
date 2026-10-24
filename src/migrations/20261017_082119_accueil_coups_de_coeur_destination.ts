import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "featured_destination" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"place_id" integer,
  	"eyebrow" varchar DEFAULT 'Le grand Sud',
  	"title" varchar DEFAULT 'Le Sahara, comme nulle part ailleurs.',
  	"text" varchar DEFAULT 'Canyons de grès, peintures rupestres millénaires et oasis : préparez votre voyage avec des repères fiables.',
  	"cta" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "places" ADD COLUMN "favorite" boolean DEFAULT false;
  ALTER TABLE "_places_v" ADD COLUMN "version_favorite" boolean DEFAULT false;
  ALTER TABLE "featured_destination" ADD CONSTRAINT "featured_destination_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "featured_destination_place_idx" ON "featured_destination" USING btree ("place_id");
  CREATE INDEX "places_favorite_idx" ON "places" USING btree ("favorite");
  CREATE INDEX "_places_v_version_version_favorite_idx" ON "_places_v" USING btree ("version_favorite");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "featured_destination" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "featured_destination" CASCADE;
  DROP INDEX "places_favorite_idx";
  DROP INDEX "_places_v_version_version_favorite_idx";
  ALTER TABLE "places" DROP COLUMN "favorite";
  ALTER TABLE "_places_v" DROP COLUMN "version_favorite";`)
}
