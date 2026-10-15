import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_practitioners_specialties" AS ENUM('medecine-generale', 'pediatrie', 'gynecologie', 'cardiologie', 'dermatologie', 'ophtalmologie', 'orl', 'psychiatrie', 'endocrinologie', 'gastro-enterologie', 'rhumatologie', 'dentiste', 'orthodontie', 'sage-femme', 'kinesitherapie', 'orthophonie', 'psychologie', 'dietetique', 'hijama', 'naturopathie');
  CREATE TYPE "public"."enum_practitioners_languages" AS ENUM('ar', 'fr', 'kab', 'en');
  CREATE TYPE "public"."enum_practitioners_modes" AS ENUM('cabinet', 'visio');
  CREATE TYPE "public"."enum_practitioners_weekly_day" AS ENUM('0', '1', '2', '3', '4', '5', '6');
  CREATE TYPE "public"."enum_practitioners_weekly_mode" AS ENUM('both', 'cabinet', 'visio');
  CREATE TYPE "public"."enum_practitioners_wilaya" AS ENUM('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69');
  CREATE TYPE "public"."enum_practitioners_status" AS ENUM('pending', 'published', 'suspended');
  CREATE TYPE "public"."enum_appointments_mode" AS ENUM('cabinet', 'visio');
  CREATE TYPE "public"."enum_appointments_status" AS ENUM('confirmed', 'cancelled', 'completed', 'no_show');
  CREATE TYPE "public"."enum_appointments_cancelled_by" AS ENUM('patient', 'practitioner', 'staff');
  CREATE TYPE "public"."enum_members_kind" AS ENUM('particulier', 'pro');
  CREATE TABLE "practitioners_specialties" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_practitioners_specialties",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "practitioners_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_practitioners_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "practitioners_modes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_practitioners_modes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "practitioners_weekly" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day" "enum_practitioners_weekly_day" NOT NULL,
  	"start" varchar NOT NULL,
  	"end" varchar NOT NULL,
  	"mode" "enum_practitioners_weekly_mode" DEFAULT 'both'
  );
  
  CREATE TABLE "practitioners_closures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"from" timestamp(3) with time zone NOT NULL,
  	"to" timestamp(3) with time zone NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "practitioners_diplomas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"institution" varchar,
  	"year" numeric,
  	"verified" boolean
  );
  
  CREATE TABLE "practitioners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"title" varchar,
  	"photo_id" integer,
  	"bio" varchar,
  	"cabinet_name" varchar,
  	"address" varchar,
  	"city" varchar NOT NULL,
  	"wilaya" "enum_practitioners_wilaya",
  	"lat" numeric,
  	"lng" numeric,
  	"phone" varchar,
  	"fee" varchar,
  	"payment" varchar,
  	"payment_link" varchar,
  	"slot_minutes" numeric DEFAULT 30,
  	"min_notice_hours" numeric DEFAULT 2,
  	"horizon_days" numeric DEFAULT 60,
  	"cancel_notice_hours" numeric DEFAULT 24,
  	"identity_verified" boolean,
  	"verified_at" timestamp(3) with time zone,
  	"verified_by" varchar,
  	"internal_note" varchar,
  	"status" "enum_practitioners_status" DEFAULT 'pending' NOT NULL,
  	"owner_id" integer,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "appointments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"practitioner_id" integer NOT NULL,
  	"patient_id" integer NOT NULL,
  	"start" timestamp(3) with time zone NOT NULL,
  	"end" timestamp(3) with time zone NOT NULL,
  	"mode" "enum_appointments_mode" NOT NULL,
  	"status" "enum_appointments_status" DEFAULT 'confirmed' NOT NULL,
  	"reason" varchar,
  	"cancelled_by" "enum_appointments_cancelled_by",
  	"cancel_reason" varchar,
  	"video_url" varchar,
  	"consent_at" timestamp(3) with time zone NOT NULL,
  	"reminder_sent_at" timestamp(3) with time zone,
  	"slot_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "members_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"kind" "enum_members_kind" DEFAULT 'particulier' NOT NULL,
  	"terms_accepted_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "practitioners_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "appointments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "members_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "members_id" integer;
  ALTER TABLE "practitioners_specialties" ADD CONSTRAINT "practitioners_specialties_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."practitioners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "practitioners_languages" ADD CONSTRAINT "practitioners_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."practitioners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "practitioners_modes" ADD CONSTRAINT "practitioners_modes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."practitioners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "practitioners_weekly" ADD CONSTRAINT "practitioners_weekly_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."practitioners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "practitioners_closures" ADD CONSTRAINT "practitioners_closures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."practitioners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "practitioners_diplomas" ADD CONSTRAINT "practitioners_diplomas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."practitioners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "practitioners" ADD CONSTRAINT "practitioners_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "practitioners" ADD CONSTRAINT "practitioners_owner_id_members_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_members_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "members_sessions" ADD CONSTRAINT "members_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "practitioners_specialties_order_idx" ON "practitioners_specialties" USING btree ("order");
  CREATE INDEX "practitioners_specialties_parent_idx" ON "practitioners_specialties" USING btree ("parent_id");
  CREATE INDEX "practitioners_languages_order_idx" ON "practitioners_languages" USING btree ("order");
  CREATE INDEX "practitioners_languages_parent_idx" ON "practitioners_languages" USING btree ("parent_id");
  CREATE INDEX "practitioners_modes_order_idx" ON "practitioners_modes" USING btree ("order");
  CREATE INDEX "practitioners_modes_parent_idx" ON "practitioners_modes" USING btree ("parent_id");
  CREATE INDEX "practitioners_weekly_order_idx" ON "practitioners_weekly" USING btree ("_order");
  CREATE INDEX "practitioners_weekly_parent_id_idx" ON "practitioners_weekly" USING btree ("_parent_id");
  CREATE INDEX "practitioners_closures_order_idx" ON "practitioners_closures" USING btree ("_order");
  CREATE INDEX "practitioners_closures_parent_id_idx" ON "practitioners_closures" USING btree ("_parent_id");
  CREATE INDEX "practitioners_diplomas_order_idx" ON "practitioners_diplomas" USING btree ("_order");
  CREATE INDEX "practitioners_diplomas_parent_id_idx" ON "practitioners_diplomas" USING btree ("_parent_id");
  CREATE INDEX "practitioners_photo_idx" ON "practitioners" USING btree ("photo_id");
  CREATE INDEX "practitioners_owner_idx" ON "practitioners" USING btree ("owner_id");
  CREATE UNIQUE INDEX "practitioners_slug_idx" ON "practitioners" USING btree ("slug");
  CREATE INDEX "practitioners_updated_at_idx" ON "practitioners" USING btree ("updated_at");
  CREATE INDEX "practitioners_created_at_idx" ON "practitioners" USING btree ("created_at");
  CREATE INDEX "appointments_practitioner_idx" ON "appointments" USING btree ("practitioner_id");
  CREATE INDEX "appointments_patient_idx" ON "appointments" USING btree ("patient_id");
  CREATE INDEX "appointments_start_idx" ON "appointments" USING btree ("start");
  CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status");
  CREATE UNIQUE INDEX "appointments_slot_key_idx" ON "appointments" USING btree ("slot_key");
  CREATE INDEX "appointments_updated_at_idx" ON "appointments" USING btree ("updated_at");
  CREATE INDEX "appointments_created_at_idx" ON "appointments" USING btree ("created_at");
  CREATE INDEX "members_sessions_order_idx" ON "members_sessions" USING btree ("_order");
  CREATE INDEX "members_sessions_parent_id_idx" ON "members_sessions" USING btree ("_parent_id");
  CREATE INDEX "members_updated_at_idx" ON "members" USING btree ("updated_at");
  CREATE INDEX "members_created_at_idx" ON "members" USING btree ("created_at");
  CREATE UNIQUE INDEX "members_email_idx" ON "members" USING btree ("email");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_practitioners_fk" FOREIGN KEY ("practitioners_id") REFERENCES "public"."practitioners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_appointments_fk" FOREIGN KEY ("appointments_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_practitioners_id_idx" ON "payload_locked_documents_rels" USING btree ("practitioners_id");
  CREATE INDEX "payload_locked_documents_rels_appointments_id_idx" ON "payload_locked_documents_rels" USING btree ("appointments_id");
  CREATE INDEX "payload_locked_documents_rels_members_id_idx" ON "payload_locked_documents_rels" USING btree ("members_id");
  CREATE INDEX "payload_preferences_rels_members_id_idx" ON "payload_preferences_rels" USING btree ("members_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "practitioners_specialties" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "practitioners_languages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "practitioners_modes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "practitioners_weekly" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "practitioners_closures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "practitioners_diplomas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "practitioners" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "appointments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "members_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "members" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "practitioners_specialties" CASCADE;
  DROP TABLE "practitioners_languages" CASCADE;
  DROP TABLE "practitioners_modes" CASCADE;
  DROP TABLE "practitioners_weekly" CASCADE;
  DROP TABLE "practitioners_closures" CASCADE;
  DROP TABLE "practitioners_diplomas" CASCADE;
  DROP TABLE "practitioners" CASCADE;
  DROP TABLE "appointments" CASCADE;
  DROP TABLE "members_sessions" CASCADE;
  DROP TABLE "members" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_practitioners_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_appointments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_members_fk";
  
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_members_fk";
  
  DROP INDEX "payload_locked_documents_rels_practitioners_id_idx";
  DROP INDEX "payload_locked_documents_rels_appointments_id_idx";
  DROP INDEX "payload_locked_documents_rels_members_id_idx";
  DROP INDEX "payload_preferences_rels_members_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "practitioners_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "appointments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "members_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "members_id";
  DROP TYPE "public"."enum_practitioners_specialties";
  DROP TYPE "public"."enum_practitioners_languages";
  DROP TYPE "public"."enum_practitioners_modes";
  DROP TYPE "public"."enum_practitioners_weekly_day";
  DROP TYPE "public"."enum_practitioners_weekly_mode";
  DROP TYPE "public"."enum_practitioners_wilaya";
  DROP TYPE "public"."enum_practitioners_status";
  DROP TYPE "public"."enum_appointments_mode";
  DROP TYPE "public"."enum_appointments_status";
  DROP TYPE "public"."enum_appointments_cancelled_by";
  DROP TYPE "public"."enum_members_kind";`)
}
