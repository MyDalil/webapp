import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Lot H2 (19 nov. 2026) — additive seulement : table `payments` (paiements des professionnels, montants en centimes),
 * colonne `country` (défaut DZ) sur `sponsorships`, `faqs`, `moments`, `payments`. Aucune suppression, aucune donnée écrite.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_faqs_country" AS ENUM('DZ', 'FR', 'BE', 'CA', 'CH', 'ES', 'IT', 'DE', 'GB', 'US', 'TN', 'MA', 'AE', 'QA', 'SA', 'TR');
  CREATE TYPE "public"."enum_moments_country" AS ENUM('DZ', 'FR', 'BE', 'CA', 'CH', 'ES', 'IT', 'DE', 'GB', 'US', 'TN', 'MA', 'AE', 'QA', 'SA', 'TR');
  CREATE TYPE "public"."enum_sponsorships_country" AS ENUM('DZ', 'FR', 'BE', 'CA', 'CH', 'ES', 'IT', 'DE', 'GB', 'US', 'TN', 'MA', 'AE', 'QA', 'SA', 'TR');
  CREATE TYPE "public"."enum_payments_provider" AS ENUM('cib', 'edahabia', 'baridimob', 'ccp', 'especes', 'virement', 'stripe', 'autre');
  CREATE TYPE "public"."enum_payments_currency" AS ENUM('DZD', 'EUR', 'USD');
  CREATE TYPE "public"."enum_payments_status" AS ENUM('en_attente', 'recu', 'rembourse', 'annule');
  CREATE TYPE "public"."enum_payments_country" AS ENUM('DZ', 'FR', 'BE', 'CA', 'CH', 'ES', 'IT', 'DE', 'GB', 'US', 'TN', 'MA', 'AE', 'QA', 'SA', 'TR');
  CREATE TABLE "payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"provider" "enum_payments_provider" NOT NULL,
  	"reference" varchar,
  	"amount" numeric NOT NULL,
  	"currency" "enum_payments_currency" DEFAULT 'DZD' NOT NULL,
  	"status" "enum_payments_status" DEFAULT 'en_attente' NOT NULL,
  	"paid_at" timestamp(3) with time zone,
  	"member_id" integer,
  	"sponsorship_id" integer,
  	"country" "enum_payments_country" DEFAULT 'DZ' NOT NULL,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "faqs" ADD COLUMN "country" "enum_faqs_country" DEFAULT 'DZ' NOT NULL;
  ALTER TABLE "moments" ADD COLUMN "country" "enum_moments_country" DEFAULT 'DZ' NOT NULL;
  ALTER TABLE "sponsorships" ADD COLUMN "country" "enum_sponsorships_country" DEFAULT 'DZ' NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payments_id" integer;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_sponsorship_id_sponsorships_id_fk" FOREIGN KEY ("sponsorship_id") REFERENCES "public"."sponsorships"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");
  CREATE INDEX "payments_member_idx" ON "payments" USING btree ("member_id");
  CREATE INDEX "payments_sponsorship_idx" ON "payments" USING btree ("sponsorship_id");
  CREATE INDEX "payments_country_idx" ON "payments" USING btree ("country");
  CREATE INDEX "payments_updated_at_idx" ON "payments" USING btree ("updated_at");
  CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "faqs_country_idx" ON "faqs" USING btree ("country");
  CREATE INDEX "moments_country_idx" ON "moments" USING btree ("country");
  CREATE INDEX "sponsorships_country_idx" ON "sponsorships" USING btree ("country");
  CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("payments_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_payments_fk";
  ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payments" CASCADE;
  
  DROP INDEX "faqs_country_idx";
  DROP INDEX "moments_country_idx";
  DROP INDEX "sponsorships_country_idx";
  DROP INDEX "payload_locked_documents_rels_payments_id_idx";
  ALTER TABLE "faqs" DROP COLUMN "country";
  ALTER TABLE "moments" DROP COLUMN "country";
  ALTER TABLE "sponsorships" DROP COLUMN "country";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payments_id";
  DROP TYPE "public"."enum_faqs_country";
  DROP TYPE "public"."enum_moments_country";
  DROP TYPE "public"."enum_sponsorships_country";
  DROP TYPE "public"."enum_payments_provider";
  DROP TYPE "public"."enum_payments_currency";
  DROP TYPE "public"."enum_payments_status";
  DROP TYPE "public"."enum_payments_country";`)
}
