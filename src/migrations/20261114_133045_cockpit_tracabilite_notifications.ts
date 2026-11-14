import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_agents_tool_modes_tool" AS ENUM('read-content', 'draft-content', 'web-search', 'message-agents', 'create-tasks', 'draft-email', 'draft-telegram', 'read-inbox', 'read-health', 'review-classifieds', 'translate', 'write-alt-text', 'suggest-tags', 'fix-broken-links');
  CREATE TYPE "public"."enum_agents_tool_modes_mode" AS ENUM('execute', 'propose', 'forbidden');
  CREATE TYPE "public"."enum_agent_notifications_phase" AS ENUM('before', 'during', 'after', 'order');
  CREATE TYPE "public"."enum_audit_log_environment" AS ENUM('production', 'preview', 'development');
  CREATE TYPE "public"."enum_controls_notifications_before" AS ENUM('admin', 'telegram_said', 'telegram_rad', 'email');
  CREATE TYPE "public"."enum_controls_notifications_during" AS ENUM('admin', 'telegram_said', 'telegram_rad', 'email');
  CREATE TYPE "public"."enum_controls_notifications_after" AS ENUM('admin', 'telegram_said', 'telegram_rad', 'email');
  CREATE TYPE "public"."enum_controls_notifications_order" AS ENUM('admin', 'telegram_said', 'telegram_rad', 'email');
  ALTER TYPE "public"."enum_agents_tools" ADD VALUE 'translate';
  ALTER TYPE "public"."enum_agents_tools" ADD VALUE 'write-alt-text';
  ALTER TYPE "public"."enum_agents_tools" ADD VALUE 'suggest-tags';
  ALTER TYPE "public"."enum_agents_tools" ADD VALUE 'fix-broken-links';
  CREATE TABLE "agents_tool_modes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tool" "enum_agents_tool_modes_tool" NOT NULL,
  	"mode" "enum_agents_tool_modes_mode" NOT NULL
  );
  
  CREATE TABLE "agent_notifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"phase" "enum_agent_notifications_phase" NOT NULL,
  	"agent_label" varchar,
  	"action_id" varchar,
  	"title" varchar NOT NULL,
  	"body" varchar,
  	"agent_id" integer,
  	"task_id" integer,
  	"attachments" jsonb,
  	"delivery" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "agent_notifications_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "controls_notifications_before" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_controls_notifications_before",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "controls_notifications_during" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_controls_notifications_during",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "controls_notifications_after" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_controls_notifications_after",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "controls_notifications_order" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_controls_notifications_order",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "audit_log" ADD COLUMN "action_id" varchar;
  ALTER TABLE "audit_log" ADD COLUMN "agent_slug" varchar;
  ALTER TABLE "audit_log" ADD COLUMN "department" varchar;
  ALTER TABLE "audit_log" ADD COLUMN "task_id" varchar;
  ALTER TABLE "audit_log" ADD COLUMN "step" numeric;
  ALTER TABLE "audit_log" ADD COLUMN "tool" varchar;
  ALTER TABLE "audit_log" ADD COLUMN "environment" "enum_audit_log_environment";
  ALTER TABLE "audit_log" ADD COLUMN "cost_micros" numeric;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "agent_notifications_id" integer;
  ALTER TABLE "agents_tool_modes" ADD CONSTRAINT "agents_tool_modes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "agent_notifications" ADD CONSTRAINT "agent_notifications_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_notifications" ADD CONSTRAINT "agent_notifications_task_id_agent_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agent_tasks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_notifications_rels" ADD CONSTRAINT "agent_notifications_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."agent_notifications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "agent_notifications_rels" ADD CONSTRAINT "agent_notifications_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "controls_notifications_before" ADD CONSTRAINT "controls_notifications_before_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."controls"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "controls_notifications_during" ADD CONSTRAINT "controls_notifications_during_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."controls"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "controls_notifications_after" ADD CONSTRAINT "controls_notifications_after_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."controls"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "controls_notifications_order" ADD CONSTRAINT "controls_notifications_order_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."controls"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "agents_tool_modes_order_idx" ON "agents_tool_modes" USING btree ("_order");
  CREATE INDEX "agents_tool_modes_parent_id_idx" ON "agents_tool_modes" USING btree ("_parent_id");
  CREATE INDEX "agent_notifications_phase_idx" ON "agent_notifications" USING btree ("phase");
  CREATE INDEX "agent_notifications_action_id_idx" ON "agent_notifications" USING btree ("action_id");
  CREATE INDEX "agent_notifications_agent_idx" ON "agent_notifications" USING btree ("agent_id");
  CREATE INDEX "agent_notifications_task_idx" ON "agent_notifications" USING btree ("task_id");
  CREATE INDEX "agent_notifications_updated_at_idx" ON "agent_notifications" USING btree ("updated_at");
  CREATE INDEX "agent_notifications_created_at_idx" ON "agent_notifications" USING btree ("created_at");
  CREATE INDEX "agent_notifications_rels_order_idx" ON "agent_notifications_rels" USING btree ("order");
  CREATE INDEX "agent_notifications_rels_parent_idx" ON "agent_notifications_rels" USING btree ("parent_id");
  CREATE INDEX "agent_notifications_rels_path_idx" ON "agent_notifications_rels" USING btree ("path");
  CREATE INDEX "agent_notifications_rels_users_id_idx" ON "agent_notifications_rels" USING btree ("users_id");
  CREATE INDEX "controls_notifications_before_order_idx" ON "controls_notifications_before" USING btree ("order");
  CREATE INDEX "controls_notifications_before_parent_idx" ON "controls_notifications_before" USING btree ("parent_id");
  CREATE INDEX "controls_notifications_during_order_idx" ON "controls_notifications_during" USING btree ("order");
  CREATE INDEX "controls_notifications_during_parent_idx" ON "controls_notifications_during" USING btree ("parent_id");
  CREATE INDEX "controls_notifications_after_order_idx" ON "controls_notifications_after" USING btree ("order");
  CREATE INDEX "controls_notifications_after_parent_idx" ON "controls_notifications_after" USING btree ("parent_id");
  CREATE INDEX "controls_notifications_order_order_idx" ON "controls_notifications_order" USING btree ("order");
  CREATE INDEX "controls_notifications_order_parent_idx" ON "controls_notifications_order" USING btree ("parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agent_notifications_fk" FOREIGN KEY ("agent_notifications_id") REFERENCES "public"."agent_notifications"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "audit_log_action_id_idx" ON "audit_log" USING btree ("action_id");
  CREATE INDEX "audit_log_agent_slug_idx" ON "audit_log" USING btree ("agent_slug");
  CREATE INDEX "audit_log_task_id_idx" ON "audit_log" USING btree ("task_id");
  CREATE INDEX "payload_locked_documents_rels_agent_notifications_id_idx" ON "payload_locked_documents_rels" USING btree ("agent_notifications_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "agents_tool_modes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "agent_notifications" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "agent_notifications_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "controls_notifications_before" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "controls_notifications_during" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "controls_notifications_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "controls_notifications_order" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "agents_tool_modes" CASCADE;
  DROP TABLE "agent_notifications" CASCADE;
  DROP TABLE "agent_notifications_rels" CASCADE;
  DROP TABLE "controls_notifications_before" CASCADE;
  DROP TABLE "controls_notifications_during" CASCADE;
  DROP TABLE "controls_notifications_after" CASCADE;
  DROP TABLE "controls_notifications_order" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_agent_notifications_fk";
  
  ALTER TABLE "agents_tools" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_agents_tools";
  CREATE TYPE "public"."enum_agents_tools" AS ENUM('read-content', 'draft-content', 'web-search', 'message-agents', 'create-tasks', 'draft-email', 'draft-telegram', 'read-inbox', 'read-health', 'review-classifieds');
  ALTER TABLE "agents_tools" ALTER COLUMN "value" SET DATA TYPE "public"."enum_agents_tools" USING "value"::"public"."enum_agents_tools";
  DROP INDEX "audit_log_action_id_idx";
  DROP INDEX "audit_log_agent_slug_idx";
  DROP INDEX "audit_log_task_id_idx";
  DROP INDEX "payload_locked_documents_rels_agent_notifications_id_idx";
  ALTER TABLE "audit_log" DROP COLUMN "action_id";
  ALTER TABLE "audit_log" DROP COLUMN "agent_slug";
  ALTER TABLE "audit_log" DROP COLUMN "department";
  ALTER TABLE "audit_log" DROP COLUMN "task_id";
  ALTER TABLE "audit_log" DROP COLUMN "step";
  ALTER TABLE "audit_log" DROP COLUMN "tool";
  ALTER TABLE "audit_log" DROP COLUMN "environment";
  ALTER TABLE "audit_log" DROP COLUMN "cost_micros";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "agent_notifications_id";
  DROP TYPE "public"."enum_agents_tool_modes_tool";
  DROP TYPE "public"."enum_agents_tool_modes_mode";
  DROP TYPE "public"."enum_agent_notifications_phase";
  DROP TYPE "public"."enum_audit_log_environment";
  DROP TYPE "public"."enum_controls_notifications_before";
  DROP TYPE "public"."enum_controls_notifications_during";
  DROP TYPE "public"."enum_controls_notifications_after";
  DROP TYPE "public"."enum_controls_notifications_order";`)
}
