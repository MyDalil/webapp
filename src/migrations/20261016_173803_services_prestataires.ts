import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_providers_languages" AS ENUM('ar', 'kab', 'fr', 'en');
  CREATE TYPE "public"."enum_providers_offers_activity" AS ENUM('montage-meubles', 'petits-travaux', 'plomberie', 'electricite', 'peinture', 'fixations', 'climatisation', 'serrurerie', 'carrelage', 'menage-regulier', 'grand-menage', 'fin-de-chantier', 'repassage', 'vitres', 'tapis-canapes', 'nettoyage-voiture', 'aide-demenagement', 'transport-fourgon', 'debarras', 'tonte', 'taille', 'entretien-jardin', 'arrosage', 'piscine', 'baby-sitting', 'sortie-ecole', 'aide-devoirs', 'garde-animal-domicile', 'promenade', 'visites-nourrissage', 'depannage-pc', 'internet-wifi', 'smartphone', 'cameras', 'initiation-informatique', 'compagnie-seniors', 'courses', 'repas', 'accompagnement-rdv', 'auxiliaire-vie', 'soutien-primaire', 'soutien-cem', 'soutien-lycee', 'prepa-bem-bac', 'cours-langues', 'musique', 'lecture-coran', 'tajwid', 'hifz', 'arabe-coranique', 'remise-en-forme', 'musculation', 'yoga-pilates', 'arts-martiaux', 'sport-exterieur');
  CREATE TYPE "public"."enum_providers_offers_pricing" AS ENUM('hour', 'flat');
  CREATE TYPE "public"."enum_providers_categories" AS ENUM('bricolage', 'menage', 'demenagement', 'jardinage', 'garde-enfants', 'garde-animaux', 'informatique', 'aide-domicile', 'cours-particuliers', 'cours-coraniques', 'coach-sportif');
  CREATE TYPE "public"."enum_providers_activities" AS ENUM('montage-meubles', 'petits-travaux', 'plomberie', 'electricite', 'peinture', 'fixations', 'climatisation', 'serrurerie', 'carrelage', 'menage-regulier', 'grand-menage', 'fin-de-chantier', 'repassage', 'vitres', 'tapis-canapes', 'nettoyage-voiture', 'aide-demenagement', 'transport-fourgon', 'debarras', 'tonte', 'taille', 'entretien-jardin', 'arrosage', 'piscine', 'baby-sitting', 'sortie-ecole', 'aide-devoirs', 'garde-animal-domicile', 'promenade', 'visites-nourrissage', 'depannage-pc', 'internet-wifi', 'smartphone', 'cameras', 'initiation-informatique', 'compagnie-seniors', 'courses', 'repas', 'accompagnement-rdv', 'auxiliaire-vie', 'soutien-primaire', 'soutien-cem', 'soutien-lycee', 'prepa-bem-bac', 'cours-langues', 'musique', 'lecture-coran', 'tajwid', 'hifz', 'arabe-coranique', 'remise-en-forme', 'musculation', 'yoga-pilates', 'arts-martiaux', 'sport-exterieur');
  CREATE TYPE "public"."enum_providers_weekly_day" AS ENUM('0', '1', '2', '3', '4', '5', '6');
  CREATE TYPE "public"."enum_providers_gender" AS ENUM('femme', 'homme');
  CREATE TYPE "public"."enum_providers_clientele" AS ENUM('all', 'women', 'men');
  CREATE TYPE "public"."enum_providers_wilaya" AS ENUM('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58');
  CREATE TYPE "public"."enum_providers_legal_form" AS ENUM('auto-entrepreneur', 'registre-commerce');
  CREATE TYPE "public"."enum_providers_status" AS ENUM('pending', 'published', 'suspended');
  CREATE TYPE "public"."enum_missions_activity" AS ENUM('montage-meubles', 'petits-travaux', 'plomberie', 'electricite', 'peinture', 'fixations', 'climatisation', 'serrurerie', 'carrelage', 'menage-regulier', 'grand-menage', 'fin-de-chantier', 'repassage', 'vitres', 'tapis-canapes', 'nettoyage-voiture', 'aide-demenagement', 'transport-fourgon', 'debarras', 'tonte', 'taille', 'entretien-jardin', 'arrosage', 'piscine', 'baby-sitting', 'sortie-ecole', 'aide-devoirs', 'garde-animal-domicile', 'promenade', 'visites-nourrissage', 'depannage-pc', 'internet-wifi', 'smartphone', 'cameras', 'initiation-informatique', 'compagnie-seniors', 'courses', 'repas', 'accompagnement-rdv', 'auxiliaire-vie', 'soutien-primaire', 'soutien-cem', 'soutien-lycee', 'prepa-bem-bac', 'cours-langues', 'musique', 'lecture-coran', 'tajwid', 'hifz', 'arabe-coranique', 'remise-en-forme', 'musculation', 'yoga-pilates', 'arts-martiaux', 'sport-exterieur');
  CREATE TYPE "public"."enum_missions_category" AS ENUM('bricolage', 'menage', 'demenagement', 'jardinage', 'garde-enfants', 'garde-animaux', 'informatique', 'aide-domicile', 'cours-particuliers', 'cours-coraniques', 'coach-sportif');
  CREATE TYPE "public"."enum_missions_pricing" AS ENUM('hour', 'flat');
  CREATE TYPE "public"."enum_missions_status" AS ENUM('requested', 'accepted', 'declined', 'expired', 'cancelled', 'completed');
  CREATE TYPE "public"."enum_missions_cancelled_by" AS ENUM('client', 'provider', 'staff');
  CREATE TYPE "public"."enum_mission_messages_from" AS ENUM('client', 'provider', 'system');
  CREATE TYPE "public"."enum_provider_reviews_status" AS ENUM('published', 'hidden');
  CREATE TYPE "public"."enum_members_gender" AS ENUM('femme', 'homme');
  CREATE TABLE "providers_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_providers_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "providers_offers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"activity" "enum_providers_offers_activity" NOT NULL,
  	"pricing" "enum_providers_offers_pricing" DEFAULT 'hour' NOT NULL,
  	"price" numeric,
  	"unit" varchar,
  	"hours" numeric DEFAULT 2
  );
  
  CREATE TABLE "providers_categories" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_providers_categories",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "providers_activities" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_providers_activities",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "providers_weekly" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day" "enum_providers_weekly_day" NOT NULL,
  	"start" varchar NOT NULL,
  	"end" varchar NOT NULL
  );
  
  CREATE TABLE "providers_closures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"from" timestamp(3) with time zone NOT NULL,
  	"to" timestamp(3) with time zone NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "providers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"display_name" varchar NOT NULL,
  	"gender" "enum_providers_gender",
  	"photo_id" integer,
  	"bio" varchar,
  	"clientele" "enum_providers_clientele" DEFAULT 'all' NOT NULL,
  	"experience_years" numeric,
  	"payment" varchar,
  	"wilaya" "enum_providers_wilaya" NOT NULL,
  	"base_commune" varchar,
  	"whole_wilaya" boolean DEFAULT false,
  	"radius_km" numeric,
  	"min_notice_hours" numeric DEFAULT 12,
  	"horizon_days" numeric DEFAULT 60,
  	"cancel_notice_hours" numeric DEFAULT 24,
  	"identity_verified" boolean,
  	"verified_at" timestamp(3) with time zone,
  	"verified_by" varchar,
  	"legal_form" "enum_providers_legal_form",
  	"legal_number" varchar,
  	"legal_verified" boolean,
  	"background_checked_at" timestamp(3) with time zone,
  	"internal_note" varchar,
  	"status" "enum_providers_status" DEFAULT 'pending' NOT NULL,
  	"demo" boolean DEFAULT false,
  	"owner_id" integer,
  	"slug" varchar,
  	"rating_avg" numeric,
  	"rating_count" numeric DEFAULT 0,
  	"missions_done" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "providers_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "missions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"provider_id" integer NOT NULL,
  	"client_id" integer NOT NULL,
  	"activity" "enum_missions_activity" NOT NULL,
  	"category" "enum_missions_category",
  	"start" timestamp(3) with time zone NOT NULL,
  	"end" timestamp(3) with time zone NOT NULL,
  	"hours" numeric NOT NULL,
  	"pricing" "enum_missions_pricing" NOT NULL,
  	"unit_price" numeric,
  	"estimate" numeric,
  	"commune" varchar NOT NULL,
  	"commune_name" varchar,
  	"address" varchar NOT NULL,
  	"details" varchar,
  	"status" "enum_missions_status" DEFAULT 'requested' NOT NULL,
  	"respond_by" timestamp(3) with time zone NOT NULL,
  	"responded_at" timestamp(3) with time zone,
  	"completed_at" timestamp(3) with time zone,
  	"cancelled_by" "enum_missions_cancelled_by",
  	"cancel_reason" varchar,
  	"consent_at" timestamp(3) with time zone NOT NULL,
  	"reminder_sent_at" timestamp(3) with time zone,
  	"review_invite_sent_at" timestamp(3) with time zone,
  	"client_notified_at" timestamp(3) with time zone,
  	"provider_notified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "mission_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"mission_id" integer NOT NULL,
  	"from" "enum_mission_messages_from" NOT NULL,
  	"read_at" timestamp(3) with time zone,
  	"body" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "provider_reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"mission_id" integer NOT NULL,
  	"provider_id" integer NOT NULL,
  	"author_id" integer NOT NULL,
  	"author_name" varchar,
  	"rating" numeric NOT NULL,
  	"activity" varchar,
  	"comment" varchar,
  	"reply" varchar,
  	"status" "enum_provider_reviews_status" DEFAULT 'published' NOT NULL,
  	"moderation_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  -- Langues ramenées à arabe, tamazight, français, anglais (décision de Rad) : retirer les autres valeurs avant de changer le type.
  DELETE FROM "places_languages" WHERE "value"::text NOT IN ('ar', 'kab', 'fr', 'en');
  DELETE FROM "_places_v_version_languages" WHERE "value"::text NOT IN ('ar', 'kab', 'fr', 'en');
  DELETE FROM "practitioners_languages" WHERE "value"::text NOT IN ('ar', 'kab', 'fr', 'en');
  ALTER TABLE "places_languages" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_places_languages";
  CREATE TYPE "public"."enum_places_languages" AS ENUM('ar', 'kab', 'fr', 'en');
  ALTER TABLE "places_languages" ALTER COLUMN "value" SET DATA TYPE "public"."enum_places_languages" USING "value"::"public"."enum_places_languages";
  ALTER TABLE "_places_v_version_languages" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum__places_v_version_languages";
  CREATE TYPE "public"."enum__places_v_version_languages" AS ENUM('ar', 'kab', 'fr', 'en');
  ALTER TABLE "_places_v_version_languages" ALTER COLUMN "value" SET DATA TYPE "public"."enum__places_v_version_languages" USING "value"::"public"."enum__places_v_version_languages";
  ALTER TABLE "practitioners_languages" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_practitioners_languages";
  CREATE TYPE "public"."enum_practitioners_languages" AS ENUM('ar', 'kab', 'fr', 'en');
  ALTER TABLE "practitioners_languages" ALTER COLUMN "value" SET DATA TYPE "public"."enum_practitioners_languages" USING "value"::"public"."enum_practitioners_languages";
  ALTER TABLE "members" ADD COLUMN "gender" "enum_members_gender";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "providers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "missions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "mission_messages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "provider_reviews_id" integer;
  ALTER TABLE "providers_languages" ADD CONSTRAINT "providers_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "providers_offers" ADD CONSTRAINT "providers_offers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "providers_categories" ADD CONSTRAINT "providers_categories_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "providers_activities" ADD CONSTRAINT "providers_activities_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "providers_weekly" ADD CONSTRAINT "providers_weekly_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "providers_closures" ADD CONSTRAINT "providers_closures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "providers" ADD CONSTRAINT "providers_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "providers" ADD CONSTRAINT "providers_owner_id_members_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "providers_texts" ADD CONSTRAINT "providers_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "missions" ADD CONSTRAINT "missions_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "missions" ADD CONSTRAINT "missions_client_id_members_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "mission_messages" ADD CONSTRAINT "mission_messages_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "provider_reviews" ADD CONSTRAINT "provider_reviews_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "provider_reviews" ADD CONSTRAINT "provider_reviews_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "provider_reviews" ADD CONSTRAINT "provider_reviews_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "providers_languages_order_idx" ON "providers_languages" USING btree ("order");
  CREATE INDEX "providers_languages_parent_idx" ON "providers_languages" USING btree ("parent_id");
  CREATE INDEX "providers_offers_order_idx" ON "providers_offers" USING btree ("_order");
  CREATE INDEX "providers_offers_parent_id_idx" ON "providers_offers" USING btree ("_parent_id");
  CREATE INDEX "providers_categories_order_idx" ON "providers_categories" USING btree ("order");
  CREATE INDEX "providers_categories_parent_idx" ON "providers_categories" USING btree ("parent_id");
  CREATE INDEX "providers_activities_order_idx" ON "providers_activities" USING btree ("order");
  CREATE INDEX "providers_activities_parent_idx" ON "providers_activities" USING btree ("parent_id");
  CREATE INDEX "providers_weekly_order_idx" ON "providers_weekly" USING btree ("_order");
  CREATE INDEX "providers_weekly_parent_id_idx" ON "providers_weekly" USING btree ("_parent_id");
  CREATE INDEX "providers_closures_order_idx" ON "providers_closures" USING btree ("_order");
  CREATE INDEX "providers_closures_parent_id_idx" ON "providers_closures" USING btree ("_parent_id");
  CREATE INDEX "providers_photo_idx" ON "providers" USING btree ("photo_id");
  CREATE INDEX "providers_owner_idx" ON "providers" USING btree ("owner_id");
  CREATE UNIQUE INDEX "providers_slug_idx" ON "providers" USING btree ("slug");
  CREATE INDEX "providers_updated_at_idx" ON "providers" USING btree ("updated_at");
  CREATE INDEX "providers_created_at_idx" ON "providers" USING btree ("created_at");
  CREATE INDEX "providers_texts_order_parent" ON "providers_texts" USING btree ("order","parent_id");
  CREATE INDEX "missions_provider_idx" ON "missions" USING btree ("provider_id");
  CREATE INDEX "missions_client_idx" ON "missions" USING btree ("client_id");
  CREATE INDEX "missions_start_idx" ON "missions" USING btree ("start");
  CREATE INDEX "missions_status_idx" ON "missions" USING btree ("status");
  CREATE INDEX "missions_updated_at_idx" ON "missions" USING btree ("updated_at");
  CREATE INDEX "missions_created_at_idx" ON "missions" USING btree ("created_at");
  CREATE INDEX "mission_messages_mission_idx" ON "mission_messages" USING btree ("mission_id");
  CREATE INDEX "mission_messages_updated_at_idx" ON "mission_messages" USING btree ("updated_at");
  CREATE INDEX "mission_messages_created_at_idx" ON "mission_messages" USING btree ("created_at");
  CREATE UNIQUE INDEX "provider_reviews_mission_idx" ON "provider_reviews" USING btree ("mission_id");
  CREATE INDEX "provider_reviews_provider_idx" ON "provider_reviews" USING btree ("provider_id");
  CREATE INDEX "provider_reviews_author_idx" ON "provider_reviews" USING btree ("author_id");
  CREATE INDEX "provider_reviews_updated_at_idx" ON "provider_reviews" USING btree ("updated_at");
  CREATE INDEX "provider_reviews_created_at_idx" ON "provider_reviews" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_providers_fk" FOREIGN KEY ("providers_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_missions_fk" FOREIGN KEY ("missions_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_mission_messages_fk" FOREIGN KEY ("mission_messages_id") REFERENCES "public"."mission_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_provider_reviews_fk" FOREIGN KEY ("provider_reviews_id") REFERENCES "public"."provider_reviews"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_providers_id_idx" ON "payload_locked_documents_rels" USING btree ("providers_id");
  CREATE INDEX "payload_locked_documents_rels_missions_id_idx" ON "payload_locked_documents_rels" USING btree ("missions_id");
  CREATE INDEX "payload_locked_documents_rels_mission_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("mission_messages_id");
  CREATE INDEX "payload_locked_documents_rels_provider_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("provider_reviews_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_places_languages" ADD VALUE 'es';
  ALTER TYPE "public"."enum_places_languages" ADD VALUE 'it';
  ALTER TYPE "public"."enum_places_languages" ADD VALUE 'de';
  ALTER TYPE "public"."enum_places_languages" ADD VALUE 'tr';
  ALTER TYPE "public"."enum__places_v_version_languages" ADD VALUE 'es';
  ALTER TYPE "public"."enum__places_v_version_languages" ADD VALUE 'it';
  ALTER TYPE "public"."enum__places_v_version_languages" ADD VALUE 'de';
  ALTER TYPE "public"."enum__places_v_version_languages" ADD VALUE 'tr';
  ALTER TYPE "public"."enum_practitioners_languages" ADD VALUE 'es';
  ALTER TYPE "public"."enum_practitioners_languages" ADD VALUE 'it';
  ALTER TYPE "public"."enum_practitioners_languages" ADD VALUE 'de';
  ALTER TYPE "public"."enum_practitioners_languages" ADD VALUE 'tr';
  ALTER TABLE "providers_languages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "providers_offers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "providers_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "providers_activities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "providers_weekly" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "providers_closures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "providers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "providers_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "missions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "mission_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "provider_reviews" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "providers_languages" CASCADE;
  DROP TABLE "providers_offers" CASCADE;
  DROP TABLE "providers_categories" CASCADE;
  DROP TABLE "providers_activities" CASCADE;
  DROP TABLE "providers_weekly" CASCADE;
  DROP TABLE "providers_closures" CASCADE;
  DROP TABLE "providers" CASCADE;
  DROP TABLE "providers_texts" CASCADE;
  DROP TABLE "missions" CASCADE;
  DROP TABLE "mission_messages" CASCADE;
  DROP TABLE "provider_reviews" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_providers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_missions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_mission_messages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_provider_reviews_fk";
  
  DROP INDEX "payload_locked_documents_rels_providers_id_idx";
  DROP INDEX "payload_locked_documents_rels_missions_id_idx";
  DROP INDEX "payload_locked_documents_rels_mission_messages_id_idx";
  DROP INDEX "payload_locked_documents_rels_provider_reviews_id_idx";
  ALTER TABLE "members" DROP COLUMN "gender";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "providers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "missions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "mission_messages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "provider_reviews_id";
  DROP TYPE "public"."enum_providers_languages";
  DROP TYPE "public"."enum_providers_offers_activity";
  DROP TYPE "public"."enum_providers_offers_pricing";
  DROP TYPE "public"."enum_providers_categories";
  DROP TYPE "public"."enum_providers_activities";
  DROP TYPE "public"."enum_providers_weekly_day";
  DROP TYPE "public"."enum_providers_gender";
  DROP TYPE "public"."enum_providers_clientele";
  DROP TYPE "public"."enum_providers_wilaya";
  DROP TYPE "public"."enum_providers_legal_form";
  DROP TYPE "public"."enum_providers_status";
  DROP TYPE "public"."enum_missions_activity";
  DROP TYPE "public"."enum_missions_category";
  DROP TYPE "public"."enum_missions_pricing";
  DROP TYPE "public"."enum_missions_status";
  DROP TYPE "public"."enum_missions_cancelled_by";
  DROP TYPE "public"."enum_mission_messages_from";
  DROP TYPE "public"."enum_provider_reviews_status";
  DROP TYPE "public"."enum_members_gender";`)
}
