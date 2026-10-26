import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "places_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"source" varchar
  );
  
  CREATE TABLE "_places_v_version_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"source" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "places_facts" ADD CONSTRAINT "places_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v_version_facts" ADD CONSTRAINT "_places_v_version_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_places_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "places_facts_order_idx" ON "places_facts" USING btree ("_order");
  CREATE INDEX "places_facts_parent_id_idx" ON "places_facts" USING btree ("_parent_id");
  CREATE INDEX "_places_v_version_facts_order_idx" ON "_places_v_version_facts" USING btree ("_order");
  CREATE INDEX "_places_v_version_facts_parent_id_idx" ON "_places_v_version_facts" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "places_facts" CASCADE;
  DROP TABLE "_places_v_version_facts" CASCADE;`)
}
