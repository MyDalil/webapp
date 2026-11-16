import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "places" ADD COLUMN "logo_id" integer;
  ALTER TABLE "_places_v" ADD COLUMN "version_logo_id" integer;
  ALTER TABLE "places" ADD CONSTRAINT "places_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_places_v" ADD CONSTRAINT "_places_v_version_logo_id_media_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "places_logo_idx" ON "places" USING btree ("logo_id");
  CREATE INDEX "_places_v_version_version_logo_idx" ON "_places_v" USING btree ("version_logo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "places" DROP CONSTRAINT "places_logo_id_media_id_fk";
  
  ALTER TABLE "_places_v" DROP CONSTRAINT "_places_v_version_logo_id_media_id_fk";
  
  DROP INDEX "places_logo_idx";
  DROP INDEX "_places_v_version_version_logo_idx";
  ALTER TABLE "places" DROP COLUMN "logo_id";
  ALTER TABLE "_places_v" DROP COLUMN "version_logo_id";`)
}
