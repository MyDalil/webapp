import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_telegram_posts_status" AS ENUM('draft', 'scheduled', 'publishing', 'published', 'failed', 'deleted');
  CREATE TYPE "public"."enum_agents_scopes" AS ENUM('decouvrir', 'vivre', 'demarches', 'services', 'annuaire', 'sante', 'communaute', 'communication', 'technique', 'pilotage');
  CREATE TYPE "public"."enum_agents_tools" AS ENUM('read-content', 'draft-content', 'web-search', 'message-agents', 'create-tasks', 'draft-email', 'draft-telegram', 'read-inbox', 'read-health');
  CREATE TYPE "public"."enum_agents_triggers" AS ENUM('any-task', 'assigned', 'draft-ready', 'inbox', 'report', 'application', 'cron');
  CREATE TYPE "public"."enum_agents_status" AS ENUM('active', 'paused', 'disabled');
  CREATE TYPE "public"."enum_agents_provider" AS ENUM('anthropic', 'openai');
  CREATE TYPE "public"."enum_agent_tasks_status" AS ENUM('new', 'running', 'paused', 'review', 'done', 'cancelled', 'failed');
  CREATE TYPE "public"."enum_agent_tasks_priority" AS ENUM('low', 'normal', 'high', 'urgent');
  CREATE TYPE "public"."enum_agent_tasks_rubrique" AS ENUM('decouvrir', 'vivre', 'demarches', 'services', 'annuaire', 'sante', 'communaute', 'communication', 'technique', 'pilotage');
  CREATE TYPE "public"."enum_agent_tasks_origin" AS ENUM('patron', 'equipe', 'agent', 'cron', 'evenement', 'telegram');
  CREATE TYPE "public"."enum_agent_messages_to_human" AS ENUM('patron', 'equipe');
  CREATE TYPE "public"."enum_agent_messages_kind" AS ENUM('directive', 'rapport', 'question', 'reponse', 'note');
  CREATE TYPE "public"."enum_agent_messages_from_kind" AS ENUM('humain', 'agent', 'systeme', 'membre');
  CREATE TYPE "public"."enum_agent_messages_channel" AS ENUM('admin', 'telegram', 'agent');
  CREATE TYPE "public"."enum_audit_log_actor_kind" AS ENUM('humain', 'agent', 'membre', 'systeme');
  CREATE TYPE "public"."enum_audit_log_channel" AS ENUM('admin', 'telegram', 'api', 'agent', 'cron');
  CREATE TYPE "public"."enum_controls_kill_switch" AS ENUM('off', 'drain', 'stop', 'cut');
  ALTER TYPE "public"."enum_users_role" ADD VALUE 'patron' BEFORE 'admin';
  CREATE TABLE "telegram_posts_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "telegram_posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"status" "enum_telegram_posts_status" DEFAULT 'draft' NOT NULL,
  	"text" varchar NOT NULL,
  	"text_ar" varchar,
  	"photo_id" integer,
  	"scheduled_at" timestamp(3) with time zone,
  	"silent" boolean DEFAULT false,
  	"pin" boolean DEFAULT false,
  	"prepared_by" varchar,
  	"decided_by_id" integer,
  	"decided_at" timestamp(3) with time zone,
  	"message_id" numeric,
  	"published_at" timestamp(3) with time zone,
  	"views" numeric,
  	"error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "agents_scopes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_agents_scopes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "agents_tools" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_agents_tools",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "agents_triggers" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_agents_triggers",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "agents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "enum_agents_status" DEFAULT 'active' NOT NULL,
  	"mission" varchar NOT NULL,
  	"provider" "enum_agents_provider" DEFAULT 'anthropic' NOT NULL,
  	"model" varchar NOT NULL,
  	"monthly_budget_usd" numeric,
  	"max_steps_per_task" numeric DEFAULT 12,
  	"memory" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar
  );
  
  CREATE TABLE "agent_tasks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"instructions" varchar NOT NULL,
  	"agent_id" integer,
  	"status" "enum_agent_tasks_status" DEFAULT 'new' NOT NULL,
  	"priority" "enum_agent_tasks_priority" DEFAULT 'normal',
  	"rubrique" "enum_agent_tasks_rubrique",
  	"directive" varchar,
  	"origin" "enum_agent_tasks_origin",
  	"issued_by_user_id" integer,
  	"issued_by_agent_id" integer,
  	"parent_id" integer,
  	"budget_usd" numeric,
  	"spent_micros" numeric DEFAULT 0,
  	"steps" numeric DEFAULT 0,
  	"max_steps" numeric,
  	"result" varchar,
  	"proposal" jsonb,
  	"reviewed_by_id" integer,
  	"reviewed_at" timestamp(3) with time zone,
  	"error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "agent_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"task_id" integer,
  	"to_agent_id" integer,
  	"to_human" "enum_agent_messages_to_human",
  	"kind" "enum_agent_messages_kind" DEFAULT 'note',
  	"body" varchar NOT NULL,
  	"from_kind" "enum_agent_messages_from_kind",
  	"from_label" varchar,
  	"from_user_id" integer,
  	"from_agent_id" integer,
  	"channel" "enum_agent_messages_channel",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audit_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"actor_kind" "enum_audit_log_actor_kind" NOT NULL,
  	"actor_label" varchar NOT NULL,
  	"actor_id" numeric,
  	"action" varchar NOT NULL,
  	"target" varchar,
  	"target_id" varchar,
  	"summary" varchar NOT NULL,
  	"changes" jsonb,
  	"channel" "enum_audit_log_channel",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "controls" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kill_switch" "enum_controls_kill_switch" DEFAULT 'off' NOT NULL,
  	"kill_switch_at" timestamp(3) with time zone,
  	"kill_switch_by" varchar,
  	"kill_switch_reason" varchar,
  	"agents_enabled" boolean DEFAULT true,
  	"telegram_enabled" boolean DEFAULT true,
  	"maintenance" boolean DEFAULT false,
  	"agents_monthly_budget_usd" numeric,
  	"telegram_channel_id" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users" ADD COLUMN "telegram_id" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "telegram_posts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "agents_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "agent_tasks_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "agent_messages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "audit_log_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "agents_id" integer;
  ALTER TABLE "telegram_posts_buttons" ADD CONSTRAINT "telegram_posts_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."telegram_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "telegram_posts" ADD CONSTRAINT "telegram_posts_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "telegram_posts" ADD CONSTRAINT "telegram_posts_decided_by_id_users_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agents_scopes" ADD CONSTRAINT "agents_scopes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "agents_tools" ADD CONSTRAINT "agents_tools_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "agents_triggers" ADD CONSTRAINT "agents_triggers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_issued_by_user_id_users_id_fk" FOREIGN KEY ("issued_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_issued_by_agent_id_agents_id_fk" FOREIGN KEY ("issued_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_parent_id_agent_tasks_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."agent_tasks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_task_id_agent_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agent_tasks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_to_agent_id_agents_id_fk" FOREIGN KEY ("to_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_from_agent_id_agents_id_fk" FOREIGN KEY ("from_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "telegram_posts_buttons_order_idx" ON "telegram_posts_buttons" USING btree ("_order");
  CREATE INDEX "telegram_posts_buttons_parent_id_idx" ON "telegram_posts_buttons" USING btree ("_parent_id");
  CREATE INDEX "telegram_posts_status_idx" ON "telegram_posts" USING btree ("status");
  CREATE INDEX "telegram_posts_photo_idx" ON "telegram_posts" USING btree ("photo_id");
  CREATE INDEX "telegram_posts_decided_by_idx" ON "telegram_posts" USING btree ("decided_by_id");
  CREATE INDEX "telegram_posts_updated_at_idx" ON "telegram_posts" USING btree ("updated_at");
  CREATE INDEX "telegram_posts_created_at_idx" ON "telegram_posts" USING btree ("created_at");
  CREATE INDEX "agents_scopes_order_idx" ON "agents_scopes" USING btree ("order");
  CREATE INDEX "agents_scopes_parent_idx" ON "agents_scopes" USING btree ("parent_id");
  CREATE INDEX "agents_tools_order_idx" ON "agents_tools" USING btree ("order");
  CREATE INDEX "agents_tools_parent_idx" ON "agents_tools" USING btree ("parent_id");
  CREATE INDEX "agents_triggers_order_idx" ON "agents_triggers" USING btree ("order");
  CREATE INDEX "agents_triggers_parent_idx" ON "agents_triggers" USING btree ("parent_id");
  CREATE UNIQUE INDEX "agents_slug_idx" ON "agents" USING btree ("slug");
  CREATE INDEX "agents_updated_at_idx" ON "agents" USING btree ("updated_at");
  CREATE INDEX "agents_created_at_idx" ON "agents" USING btree ("created_at");
  CREATE INDEX "agent_tasks_agent_idx" ON "agent_tasks" USING btree ("agent_id");
  CREATE INDEX "agent_tasks_status_idx" ON "agent_tasks" USING btree ("status");
  CREATE INDEX "agent_tasks_issued_by_user_idx" ON "agent_tasks" USING btree ("issued_by_user_id");
  CREATE INDEX "agent_tasks_issued_by_agent_idx" ON "agent_tasks" USING btree ("issued_by_agent_id");
  CREATE INDEX "agent_tasks_parent_idx" ON "agent_tasks" USING btree ("parent_id");
  CREATE INDEX "agent_tasks_reviewed_by_idx" ON "agent_tasks" USING btree ("reviewed_by_id");
  CREATE INDEX "agent_tasks_updated_at_idx" ON "agent_tasks" USING btree ("updated_at");
  CREATE INDEX "agent_tasks_created_at_idx" ON "agent_tasks" USING btree ("created_at");
  CREATE INDEX "agent_messages_task_idx" ON "agent_messages" USING btree ("task_id");
  CREATE INDEX "agent_messages_to_agent_idx" ON "agent_messages" USING btree ("to_agent_id");
  CREATE INDEX "agent_messages_from_user_idx" ON "agent_messages" USING btree ("from_user_id");
  CREATE INDEX "agent_messages_from_agent_idx" ON "agent_messages" USING btree ("from_agent_id");
  CREATE INDEX "agent_messages_updated_at_idx" ON "agent_messages" USING btree ("updated_at");
  CREATE INDEX "agent_messages_created_at_idx" ON "agent_messages" USING btree ("created_at");
  CREATE INDEX "audit_log_actor_kind_idx" ON "audit_log" USING btree ("actor_kind");
  CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");
  CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target");
  CREATE INDEX "audit_log_target_id_idx" ON "audit_log" USING btree ("target_id");
  CREATE INDEX "audit_log_updated_at_idx" ON "audit_log" USING btree ("updated_at");
  CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_telegram_posts_fk" FOREIGN KEY ("telegram_posts_id") REFERENCES "public"."telegram_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agents_fk" FOREIGN KEY ("agents_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agent_tasks_fk" FOREIGN KEY ("agent_tasks_id") REFERENCES "public"."agent_tasks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agent_messages_fk" FOREIGN KEY ("agent_messages_id") REFERENCES "public"."agent_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_log_fk" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_log"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_agents_fk" FOREIGN KEY ("agents_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_telegram_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("telegram_posts_id");
  CREATE INDEX "payload_locked_documents_rels_agents_id_idx" ON "payload_locked_documents_rels" USING btree ("agents_id");
  CREATE INDEX "payload_locked_documents_rels_agent_tasks_id_idx" ON "payload_locked_documents_rels" USING btree ("agent_tasks_id");
  CREATE INDEX "payload_locked_documents_rels_agent_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("agent_messages_id");
  CREATE INDEX "payload_locked_documents_rels_audit_log_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_log_id");
  CREATE INDEX "payload_preferences_rels_agents_id_idx" ON "payload_preferences_rels" USING btree ("agents_id");
  -- Journal d’audit et fil des agents : ajout seul, garanti par la base elle-même.
  CREATE OR REPLACE FUNCTION "dalil_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    RAISE EXCEPTION 'Table en ajout seul : % refusé sur %', TG_OP, TG_TABLE_NAME;
  END $$;
  CREATE TRIGGER "audit_log_append_only" BEFORE UPDATE OR DELETE ON "audit_log" FOR EACH ROW EXECUTE FUNCTION "dalil_append_only"();
  CREATE TRIGGER "agent_messages_append_only" BEFORE DELETE ON "agent_messages" FOR EACH ROW EXECUTE FUNCTION "dalil_append_only"();
`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "telegram_posts_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "telegram_posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "agents_scopes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "agents_tools" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "agents_triggers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "agents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "agent_tasks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "agent_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audit_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "controls" DISABLE ROW LEVEL SECURITY;
  DROP TRIGGER IF EXISTS "audit_log_append_only" ON "audit_log";
  DROP TRIGGER IF EXISTS "agent_messages_append_only" ON "agent_messages";
  DROP FUNCTION IF EXISTS "dalil_append_only"();
  DROP TABLE "telegram_posts_buttons" CASCADE;
  DROP TABLE "telegram_posts" CASCADE;
  DROP TABLE "agents_scopes" CASCADE;
  DROP TABLE "agents_tools" CASCADE;
  DROP TABLE "agents_triggers" CASCADE;
  DROP TABLE "agents" CASCADE;
  DROP TABLE "agent_tasks" CASCADE;
  DROP TABLE "agent_messages" CASCADE;
  DROP TABLE "audit_log" CASCADE;
  DROP TABLE "controls" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_telegram_posts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_agents_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_agent_tasks_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_agent_messages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audit_log_fk";
  
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_agents_fk";
  
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::text;
  DROP TYPE "public"."enum_users_role";
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::"public"."enum_users_role";
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."enum_users_role" USING "role"::"public"."enum_users_role";
  DROP INDEX "payload_locked_documents_rels_telegram_posts_id_idx";
  DROP INDEX "payload_locked_documents_rels_agents_id_idx";
  DROP INDEX "payload_locked_documents_rels_agent_tasks_id_idx";
  DROP INDEX "payload_locked_documents_rels_agent_messages_id_idx";
  DROP INDEX "payload_locked_documents_rels_audit_log_id_idx";
  DROP INDEX "payload_preferences_rels_agents_id_idx";
  ALTER TABLE "users" DROP COLUMN "telegram_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "telegram_posts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "agents_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "agent_tasks_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "agent_messages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "audit_log_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "agents_id";
  DROP TYPE "public"."enum_telegram_posts_status";
  DROP TYPE "public"."enum_agents_scopes";
  DROP TYPE "public"."enum_agents_tools";
  DROP TYPE "public"."enum_agents_triggers";
  DROP TYPE "public"."enum_agents_status";
  DROP TYPE "public"."enum_agents_provider";
  DROP TYPE "public"."enum_agent_tasks_status";
  DROP TYPE "public"."enum_agent_tasks_priority";
  DROP TYPE "public"."enum_agent_tasks_rubrique";
  DROP TYPE "public"."enum_agent_tasks_origin";
  DROP TYPE "public"."enum_agent_messages_to_human";
  DROP TYPE "public"."enum_agent_messages_kind";
  DROP TYPE "public"."enum_agent_messages_from_kind";
  DROP TYPE "public"."enum_agent_messages_channel";
  DROP TYPE "public"."enum_audit_log_actor_kind";
  DROP TYPE "public"."enum_audit_log_channel";
  DROP TYPE "public"."enum_controls_kill_switch";`)
}
