import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_classifieds_category" AS ENUM('immobilier', 'emploi', 'vehicules', 'objets');
  CREATE TYPE "public"."enum_classifieds_subcategory" AS ENUM('immobilier:appartement', 'immobilier:maison', 'immobilier:terrain', 'immobilier:local', 'immobilier:chambre', 'emploi:offre', 'emploi:demande', 'emploi:stage', 'emploi:mission', 'vehicules:voiture', 'vehicules:moto', 'vehicules:utilitaire', 'vehicules:pieces', 'objets:maison', 'objets:high-tech', 'objets:mode', 'objets:enfants', 'objets:sport', 'objets:livres', 'objets:autres');
  CREATE TYPE "public"."enum_classifieds_price_mode" AS ENUM('fixed', 'negotiable', 'free', 'on-request');
  CREATE TYPE "public"."enum_classifieds_deal" AS ENUM('vente', 'location', 'location-vacances');
  CREATE TYPE "public"."enum_classifieds_contract" AS ENUM('cdi', 'cdd', 'temps-partiel', 'saisonnier', 'independant');
  CREATE TYPE "public"."enum_classifieds_fuel" AS ENUM('essence', 'diesel', 'gpl', 'hybride', 'electrique');
  CREATE TYPE "public"."enum_classifieds_gearbox" AS ENUM('manuelle', 'automatique');
  CREATE TYPE "public"."enum_classifieds_condition" AS ENUM('neuf', 'tres-bon', 'bon', 'pieces');
  CREATE TYPE "public"."enum_classifieds_wilaya" AS ENUM('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58');
  CREATE TYPE "public"."enum_classifieds_author_kind" AS ENUM('particulier', 'pro');
  CREATE TYPE "public"."enum_classifieds_status" AS ENUM('pending', 'published', 'rejected', 'expired', 'closed');
  CREATE TYPE "public"."enum_classifieds_agent_verdict" AS ENUM('ok', 'doubt', 'reject');
  CREATE TYPE "public"."enum_classified_messages_from" AS ENUM('buyer', 'seller', 'system');
  ALTER TYPE "public"."enum_submissions_kind" ADD VALUE 'report';
  ALTER TYPE "public"."enum_agents_scopes" ADD VALUE 'annonces' BEFORE 'annuaire';
  ALTER TYPE "public"."enum_agents_tools" ADD VALUE 'review-classifieds';
  ALTER TYPE "public"."enum_agent_tasks_rubrique" ADD VALUE 'annonces' BEFORE 'annuaire';
  CREATE TABLE "classifieds" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"category" "enum_classifieds_category" NOT NULL,
  	"subcategory" "enum_classifieds_subcategory" NOT NULL,
  	"description" varchar NOT NULL,
  	"price" numeric,
  	"price_mode" "enum_classifieds_price_mode" DEFAULT 'fixed' NOT NULL,
  	"deal" "enum_classifieds_deal",
  	"rooms" numeric,
  	"surface" numeric,
  	"furnished" boolean,
  	"contract" "enum_classifieds_contract",
  	"sector" varchar,
  	"brand" varchar,
  	"model" varchar,
  	"year" numeric,
  	"mileage" numeric,
  	"fuel" "enum_classifieds_fuel",
  	"gearbox" "enum_classifieds_gearbox",
  	"condition" "enum_classifieds_condition",
  	"wilaya" "enum_classifieds_wilaya" NOT NULL,
  	"commune" varchar,
  	"author_id" integer NOT NULL,
  	"author_name" varchar,
  	"author_kind" "enum_classifieds_author_kind",
  	"status" "enum_classifieds_status" DEFAULT 'pending' NOT NULL,
  	"reports" numeric DEFAULT 0,
  	"rejection_reason" varchar,
  	"moderated_by" varchar,
  	"moderated_at" timestamp(3) with time zone,
  	"published_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"expiry_warned_at" timestamp(3) with time zone,
  	"agent_verdict" "enum_classifieds_agent_verdict",
  	"agent_name" varchar,
  	"agent_reviewed_at" timestamp(3) with time zone,
  	"agent_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "classifieds_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "classified_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"classified_id" integer NOT NULL,
  	"buyer_id" integer NOT NULL,
  	"from" "enum_classified_messages_from" NOT NULL,
  	"read_at" timestamp(3) with time zone,
  	"body" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "classifieds_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "classified_messages_id" integer;
  ALTER TABLE "classifieds" ADD CONSTRAINT "classifieds_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "classifieds_rels" ADD CONSTRAINT "classifieds_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."classifieds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "classifieds_rels" ADD CONSTRAINT "classifieds_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "classified_messages" ADD CONSTRAINT "classified_messages_classified_id_classifieds_id_fk" FOREIGN KEY ("classified_id") REFERENCES "public"."classifieds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "classified_messages" ADD CONSTRAINT "classified_messages_buyer_id_members_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "classifieds_slug_idx" ON "classifieds" USING btree ("slug");
  CREATE INDEX "classifieds_category_idx" ON "classifieds" USING btree ("category");
  CREATE INDEX "classifieds_subcategory_idx" ON "classifieds" USING btree ("subcategory");
  CREATE INDEX "classifieds_wilaya_idx" ON "classifieds" USING btree ("wilaya");
  CREATE INDEX "classifieds_author_idx" ON "classifieds" USING btree ("author_id");
  CREATE INDEX "classifieds_status_idx" ON "classifieds" USING btree ("status");
  CREATE INDEX "classifieds_expires_at_idx" ON "classifieds" USING btree ("expires_at");
  CREATE INDEX "classifieds_updated_at_idx" ON "classifieds" USING btree ("updated_at");
  CREATE INDEX "classifieds_created_at_idx" ON "classifieds" USING btree ("created_at");
  CREATE INDEX "classifieds_rels_order_idx" ON "classifieds_rels" USING btree ("order");
  CREATE INDEX "classifieds_rels_parent_idx" ON "classifieds_rels" USING btree ("parent_id");
  CREATE INDEX "classifieds_rels_path_idx" ON "classifieds_rels" USING btree ("path");
  CREATE INDEX "classifieds_rels_media_id_idx" ON "classifieds_rels" USING btree ("media_id");
  CREATE INDEX "classified_messages_classified_idx" ON "classified_messages" USING btree ("classified_id");
  CREATE INDEX "classified_messages_buyer_idx" ON "classified_messages" USING btree ("buyer_id");
  CREATE INDEX "classified_messages_updated_at_idx" ON "classified_messages" USING btree ("updated_at");
  CREATE INDEX "classified_messages_created_at_idx" ON "classified_messages" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_classifieds_fk" FOREIGN KEY ("classifieds_id") REFERENCES "public"."classifieds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_classified_messages_fk" FOREIGN KEY ("classified_messages_id") REFERENCES "public"."classified_messages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_classifieds_id_idx" ON "payload_locked_documents_rels" USING btree ("classifieds_id");
  CREATE INDEX "payload_locked_documents_rels_classified_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("classified_messages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "classifieds" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "classifieds_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "classified_messages" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "classifieds" CASCADE;
  DROP TABLE "classifieds_rels" CASCADE;
  DROP TABLE "classified_messages" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_classifieds_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_classified_messages_fk";
  
  ALTER TABLE "submissions" ALTER COLUMN "kind" SET DATA TYPE text;
  DROP TYPE "public"."enum_submissions_kind";
  CREATE TYPE "public"."enum_submissions_kind" AS ENUM('contribution', 'application', 'contact', 'feedback', 'diagnostic');
  ALTER TABLE "submissions" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_submissions_kind" USING "kind"::"public"."enum_submissions_kind";
  ALTER TABLE "agents_scopes" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_agents_scopes";
  CREATE TYPE "public"."enum_agents_scopes" AS ENUM('decouvrir', 'vivre', 'demarches', 'services', 'annuaire', 'sante', 'communaute', 'communication', 'technique', 'pilotage');
  ALTER TABLE "agents_scopes" ALTER COLUMN "value" SET DATA TYPE "public"."enum_agents_scopes" USING "value"::"public"."enum_agents_scopes";
  ALTER TABLE "agents_tools" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_agents_tools";
  CREATE TYPE "public"."enum_agents_tools" AS ENUM('read-content', 'draft-content', 'web-search', 'message-agents', 'create-tasks', 'draft-email', 'draft-telegram', 'read-inbox', 'read-health');
  ALTER TABLE "agents_tools" ALTER COLUMN "value" SET DATA TYPE "public"."enum_agents_tools" USING "value"::"public"."enum_agents_tools";
  ALTER TABLE "agent_tasks" ALTER COLUMN "rubrique" SET DATA TYPE text;
  DROP TYPE "public"."enum_agent_tasks_rubrique";
  CREATE TYPE "public"."enum_agent_tasks_rubrique" AS ENUM('decouvrir', 'vivre', 'demarches', 'services', 'annuaire', 'sante', 'communaute', 'communication', 'technique', 'pilotage');
  ALTER TABLE "agent_tasks" ALTER COLUMN "rubrique" SET DATA TYPE "public"."enum_agent_tasks_rubrique" USING "rubrique"::"public"."enum_agent_tasks_rubrique";
  DROP INDEX "payload_locked_documents_rels_classifieds_id_idx";
  DROP INDEX "payload_locked_documents_rels_classified_messages_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "classifieds_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "classified_messages_id";
  DROP TYPE "public"."enum_classifieds_category";
  DROP TYPE "public"."enum_classifieds_subcategory";
  DROP TYPE "public"."enum_classifieds_price_mode";
  DROP TYPE "public"."enum_classifieds_deal";
  DROP TYPE "public"."enum_classifieds_contract";
  DROP TYPE "public"."enum_classifieds_fuel";
  DROP TYPE "public"."enum_classifieds_gearbox";
  DROP TYPE "public"."enum_classifieds_condition";
  DROP TYPE "public"."enum_classifieds_wilaya";
  DROP TYPE "public"."enum_classifieds_author_kind";
  DROP TYPE "public"."enum_classifieds_status";
  DROP TYPE "public"."enum_classifieds_agent_verdict";
  DROP TYPE "public"."enum_classified_messages_from";`)
}
