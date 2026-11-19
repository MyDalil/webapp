import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_payments_purpose" AS ENUM('abonnement', 'boost', 'projecteur', 'leads', 'autre');
  CREATE TYPE "public"."enum_subscriptions_target_collection" AS ENUM('places', 'practitioners', 'providers');
  CREATE TYPE "public"."enum_subscriptions_plan" AS ENUM('pro_mensuel', 'pro_annuel', 'premium_mensuel', 'premium_annuel');
  CREATE TYPE "public"."enum_subscriptions_status" AS ENUM('en_attente', 'active', 'expiree', 'annulee');
  CREATE TYPE "public"."enum_subscriptions_country" AS ENUM('DZ', 'FR', 'BE', 'CA', 'CH', 'ES', 'IT', 'DE', 'GB', 'US', 'TN', 'MA', 'AE', 'QA', 'SA', 'TR');
  CREATE TYPE "public"."enum_claims_target_collection" AS ENUM('places', 'practitioners', 'providers');
  CREATE TYPE "public"."enum_claims_proof_type" AS ENUM('telephone', 'registre_commerce', 'carte_pro', 'autre');
  CREATE TYPE "public"."enum_claims_status" AS ENUM('en_attente', 'acceptee', 'refusee');
  CREATE TYPE "public"."enum_claim_documents_mimetype" AS ENUM('application/pdf', 'image/jpeg', 'image/png');
  CREATE TYPE "public"."enum_leads_target_collection" AS ENUM('places', 'practitioners', 'providers');
  CREATE TYPE "public"."enum_leads_kind" AS ENUM('devis', 'preinscription', 'rappel', 'rdv');
  CREATE TYPE "public"."enum_leads_status" AS ENUM('nouveau', 'transmis', 'traite', 'spam');
  CREATE TYPE "public"."enum_leads_country" AS ENUM('DZ', 'FR', 'BE', 'CA', 'CH', 'ES', 'IT', 'DE', 'GB', 'US', 'TN', 'MA', 'AE', 'QA', 'SA', 'TR');
  CREATE TYPE "public"."enum_bot_sessions_channel" AS ENUM('telegram', 'whatsapp');
  CREATE TYPE "public"."enum_pricing_plans_code" AS ENUM('pro', 'premium');
  ALTER TYPE "public"."enum_payments_provider" ADD VALUE 'chargily' BEFORE 'autre';
  ALTER TYPE "public"."enum_payments_provider" ADD VALUE 'slickpay' BEFORE 'autre';
  CREATE TABLE "subscriptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"target_collection" "enum_subscriptions_target_collection" NOT NULL,
  	"target_id" varchar NOT NULL,
  	"plan" "enum_subscriptions_plan" NOT NULL,
  	"status" "enum_subscriptions_status" DEFAULT 'en_attente' NOT NULL,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"payment_id" integer,
  	"reminded_at" timestamp(3) with time zone,
  	"note" varchar,
  	"country" "enum_subscriptions_country" DEFAULT 'DZ' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "claims" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"target_collection" "enum_claims_target_collection" NOT NULL,
  	"target_id" varchar NOT NULL,
  	"proof_type" "enum_claims_proof_type" NOT NULL,
  	"proof_text" varchar,
  	"proof_file_id" integer,
  	"status" "enum_claims_status" DEFAULT 'en_attente' NOT NULL,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "claim_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer,
  	"filename" varchar NOT NULL,
  	"mimetype" "enum_claim_documents_mimetype" NOT NULL,
  	"size" numeric NOT NULL,
  	"data" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "leads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"target_collection" "enum_leads_target_collection" NOT NULL,
  	"target_id" varchar NOT NULL,
  	"kind" "enum_leads_kind" NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"email" varchar,
  	"message" varchar,
  	"consent" boolean DEFAULT false NOT NULL,
  	"status" "enum_leads_status" DEFAULT 'nouveau' NOT NULL,
  	"member_id" integer,
  	"country" "enum_leads_country" DEFAULT 'DZ' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "metrics_daily" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"day" timestamp(3) with time zone NOT NULL,
  	"target_collection" varchar NOT NULL,
  	"target_id" varchar NOT NULL,
  	"views" numeric DEFAULT 0 NOT NULL,
  	"calls" numeric DEFAULT 0 NOT NULL,
  	"whatsapp" numeric DEFAULT 0 NOT NULL,
  	"directions" numeric DEFAULT 0 NOT NULL,
  	"shares" numeric DEFAULT 0 NOT NULL,
  	"leads" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "bot_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"channel" "enum_bot_sessions_channel" NOT NULL,
  	"chat_id" varchar NOT NULL,
  	"step" varchar,
  	"data" jsonb,
  	"expires_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pricing_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" "enum_pricing_plans_code" NOT NULL,
  	"label" varchar,
  	"monthly_d_z_d" numeric,
  	"monthly_e_u_r" numeric
  );
  
  CREATE TABLE "pricing" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"annual_free_months" numeric DEFAULT 2,
  	"boost7dzd" numeric,
  	"boost7eur" numeric,
  	"projecteur_d_z_d" numeric,
  	"projecteur_e_u_r" numeric,
  	"lead_pack20_d_z_d" numeric,
  	"lead_pack20_e_u_r" numeric,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "pricing_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "places" ADD COLUMN "owner_id" integer;
  ALTER TABLE "_places_v" ADD COLUMN "version_owner_id" integer;
  ALTER TABLE "payments" ADD COLUMN "purpose" "enum_payments_purpose" DEFAULT 'autre';
  ALTER TABLE "payments" ADD COLUMN "external_id" varchar;
  ALTER TABLE "payments" ADD COLUMN "subscription_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "subscriptions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "claims_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "claim_documents_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "leads_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "metrics_daily_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "bot_sessions_id" integer;
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "claims" ADD CONSTRAINT "claims_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "claims" ADD CONSTRAINT "claims_proof_file_id_claim_documents_id_fk" FOREIGN KEY ("proof_file_id") REFERENCES "public"."claim_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "claim_documents" ADD CONSTRAINT "claim_documents_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pricing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pricing_texts" ADD CONSTRAINT "pricing_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pricing"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "subscriptions_member_idx" ON "subscriptions" USING btree ("member_id");
  CREATE INDEX "subscriptions_target_id_idx" ON "subscriptions" USING btree ("target_id");
  CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");
  CREATE INDEX "subscriptions_ends_at_idx" ON "subscriptions" USING btree ("ends_at");
  CREATE INDEX "subscriptions_payment_idx" ON "subscriptions" USING btree ("payment_id");
  CREATE INDEX "subscriptions_country_idx" ON "subscriptions" USING btree ("country");
  CREATE INDEX "subscriptions_updated_at_idx" ON "subscriptions" USING btree ("updated_at");
  CREATE INDEX "subscriptions_created_at_idx" ON "subscriptions" USING btree ("created_at");
  CREATE INDEX "claims_member_idx" ON "claims" USING btree ("member_id");
  CREATE INDEX "claims_target_id_idx" ON "claims" USING btree ("target_id");
  CREATE INDEX "claims_proof_file_idx" ON "claims" USING btree ("proof_file_id");
  CREATE INDEX "claims_status_idx" ON "claims" USING btree ("status");
  CREATE INDEX "claims_updated_at_idx" ON "claims" USING btree ("updated_at");
  CREATE INDEX "claims_created_at_idx" ON "claims" USING btree ("created_at");
  CREATE INDEX "claim_documents_member_idx" ON "claim_documents" USING btree ("member_id");
  CREATE INDEX "claim_documents_updated_at_idx" ON "claim_documents" USING btree ("updated_at");
  CREATE INDEX "claim_documents_created_at_idx" ON "claim_documents" USING btree ("created_at");
  CREATE INDEX "leads_target_id_idx" ON "leads" USING btree ("target_id");
  CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");
  CREATE INDEX "leads_member_idx" ON "leads" USING btree ("member_id");
  CREATE INDEX "leads_country_idx" ON "leads" USING btree ("country");
  CREATE INDEX "leads_updated_at_idx" ON "leads" USING btree ("updated_at");
  CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");
  CREATE INDEX "metrics_daily_day_idx" ON "metrics_daily" USING btree ("day");
  CREATE INDEX "metrics_daily_target_id_idx" ON "metrics_daily" USING btree ("target_id");
  CREATE INDEX "metrics_daily_updated_at_idx" ON "metrics_daily" USING btree ("updated_at");
  CREATE INDEX "metrics_daily_created_at_idx" ON "metrics_daily" USING btree ("created_at");
  CREATE UNIQUE INDEX "day_targetCollection_targetId_idx" ON "metrics_daily" USING btree ("day","target_collection","target_id");
  CREATE INDEX "bot_sessions_chat_id_idx" ON "bot_sessions" USING btree ("chat_id");
  CREATE INDEX "bot_sessions_expires_at_idx" ON "bot_sessions" USING btree ("expires_at");
  CREATE INDEX "bot_sessions_updated_at_idx" ON "bot_sessions" USING btree ("updated_at");
  CREATE INDEX "bot_sessions_created_at_idx" ON "bot_sessions" USING btree ("created_at");
  CREATE UNIQUE INDEX "channel_chatId_idx" ON "bot_sessions" USING btree ("channel","chat_id");
  CREATE INDEX "pricing_plans_order_idx" ON "pricing_plans" USING btree ("_order");
  CREATE INDEX "pricing_plans_parent_id_idx" ON "pricing_plans" USING btree ("_parent_id");
  CREATE INDEX "pricing_texts_order_parent" ON "pricing_texts" USING btree ("order","parent_id");
  ALTER TABLE "places" ADD CONSTRAINT "places_owner_id_members_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_places_v" ADD CONSTRAINT "_places_v_version_owner_id_members_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscriptions_fk" FOREIGN KEY ("subscriptions_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_claims_fk" FOREIGN KEY ("claims_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_claim_documents_fk" FOREIGN KEY ("claim_documents_id") REFERENCES "public"."claim_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leads_fk" FOREIGN KEY ("leads_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_metrics_daily_fk" FOREIGN KEY ("metrics_daily_id") REFERENCES "public"."metrics_daily"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bot_sessions_fk" FOREIGN KEY ("bot_sessions_id") REFERENCES "public"."bot_sessions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "places_owner_idx" ON "places" USING btree ("owner_id");
  CREATE INDEX "_places_v_version_version_owner_idx" ON "_places_v" USING btree ("version_owner_id");
  CREATE INDEX "payments_purpose_idx" ON "payments" USING btree ("purpose");
  CREATE UNIQUE INDEX "payments_external_id_idx" ON "payments" USING btree ("external_id");
  CREATE INDEX "payments_subscription_idx" ON "payments" USING btree ("subscription_id");
  CREATE INDEX "payload_locked_documents_rels_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("subscriptions_id");
  CREATE INDEX "payload_locked_documents_rels_claims_id_idx" ON "payload_locked_documents_rels" USING btree ("claims_id");
  CREATE INDEX "payload_locked_documents_rels_claim_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("claim_documents_id");
  CREATE INDEX "payload_locked_documents_rels_leads_id_idx" ON "payload_locked_documents_rels" USING btree ("leads_id");
  CREATE INDEX "payload_locked_documents_rels_metrics_daily_id_idx" ON "payload_locked_documents_rels" USING btree ("metrics_daily_id");
  CREATE INDEX "payload_locked_documents_rels_bot_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("bot_sessions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "subscriptions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "claims" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "claim_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "leads" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "metrics_daily" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "bot_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pricing_plans" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pricing" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pricing_texts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "subscriptions" CASCADE;
  DROP TABLE "claims" CASCADE;
  DROP TABLE "claim_documents" CASCADE;
  DROP TABLE "leads" CASCADE;
  DROP TABLE "metrics_daily" CASCADE;
  DROP TABLE "bot_sessions" CASCADE;
  DROP TABLE "pricing_plans" CASCADE;
  DROP TABLE "pricing" CASCADE;
  DROP TABLE "pricing_texts" CASCADE;
  ALTER TABLE "places" DROP CONSTRAINT IF EXISTS "places_owner_id_members_id_fk";
  
  ALTER TABLE "_places_v" DROP CONSTRAINT IF EXISTS "_places_v_version_owner_id_members_id_fk";
  
  ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_subscription_id_subscriptions_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_subscriptions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_claims_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_claim_documents_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_leads_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_metrics_daily_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_bot_sessions_fk";
  
  ALTER TABLE "payments" ALTER COLUMN "provider" SET DATA TYPE text;
  DROP TYPE "public"."enum_payments_provider";
  CREATE TYPE "public"."enum_payments_provider" AS ENUM('cib', 'edahabia', 'baridimob', 'ccp', 'especes', 'virement', 'stripe', 'autre');
  ALTER TABLE "payments" ALTER COLUMN "provider" SET DATA TYPE "public"."enum_payments_provider" USING "provider"::"public"."enum_payments_provider";
  DROP INDEX IF EXISTS "places_owner_idx";
  DROP INDEX IF EXISTS "_places_v_version_version_owner_idx";
  DROP INDEX IF EXISTS "payments_purpose_idx";
  DROP INDEX IF EXISTS "payments_external_id_idx";
  DROP INDEX IF EXISTS "payments_subscription_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_subscriptions_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_claims_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_claim_documents_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_leads_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_metrics_daily_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_bot_sessions_id_idx";
  ALTER TABLE "places" DROP COLUMN "owner_id";
  ALTER TABLE "_places_v" DROP COLUMN "version_owner_id";
  ALTER TABLE "payments" DROP COLUMN "purpose";
  ALTER TABLE "payments" DROP COLUMN "external_id";
  ALTER TABLE "payments" DROP COLUMN "subscription_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "subscriptions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "claims_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "claim_documents_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "leads_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "metrics_daily_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "bot_sessions_id";
  DROP TYPE "public"."enum_payments_purpose";
  DROP TYPE "public"."enum_subscriptions_target_collection";
  DROP TYPE "public"."enum_subscriptions_plan";
  DROP TYPE "public"."enum_subscriptions_status";
  DROP TYPE "public"."enum_subscriptions_country";
  DROP TYPE "public"."enum_claims_target_collection";
  DROP TYPE "public"."enum_claims_proof_type";
  DROP TYPE "public"."enum_claims_status";
  DROP TYPE "public"."enum_claim_documents_mimetype";
  DROP TYPE "public"."enum_leads_target_collection";
  DROP TYPE "public"."enum_leads_kind";
  DROP TYPE "public"."enum_leads_status";
  DROP TYPE "public"."enum_leads_country";
  DROP TYPE "public"."enum_bot_sessions_channel";
  DROP TYPE "public"."enum_pricing_plans_code";`)
}
