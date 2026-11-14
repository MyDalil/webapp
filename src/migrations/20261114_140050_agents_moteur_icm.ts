import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_agents_cold_test_result" AS ENUM('pass', 'fail');
  ALTER TYPE "public"."enum_agents_status" ADD VALUE 'reserve' BEFORE 'paused';
  ALTER TYPE "public"."enum_ai_usage_feature" ADD VALUE 'agent';
  ALTER TABLE "agents" ADD COLUMN "role_id" varchar;
  ALTER TABLE "agents" ADD COLUMN "department" varchar;
  ALTER TABLE "agents" ADD COLUMN "cold_test_result" "enum_agents_cold_test_result";
  ALTER TABLE "agents" ADD COLUMN "cold_test_at" timestamp(3) with time zone;
  ALTER TABLE "agents" ADD COLUMN "cold_test_detail" varchar;
  ALTER TABLE "agent_tasks" ADD COLUMN "stage" varchar;
  ALTER TABLE "agent_tasks" ADD COLUMN "trace" jsonb;
  ALTER TABLE "ai_usage" ADD COLUMN "agent_id" integer;
  ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "agents_role_id_idx" ON "agents" USING btree ("role_id");
  CREATE INDEX "agents_department_idx" ON "agents" USING btree ("department");
  CREATE INDEX "ai_usage_agent_idx" ON "ai_usage" USING btree ("agent_id");  -- Verrou de la file des agents : une seule passe à la fois, expiration automatique (src/modules/agents/runtime/queue.ts).
  CREATE TABLE IF NOT EXISTS "agent_run_lock" ("id" integer PRIMARY KEY, "locked_until" timestamptz NOT NULL);
`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ai_usage" DROP CONSTRAINT "ai_usage_agent_id_agents_id_fk";
  
  ALTER TABLE "agents" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "agents" ALTER COLUMN "status" SET DEFAULT 'active'::text;
  DROP TYPE "public"."enum_agents_status";
  CREATE TYPE "public"."enum_agents_status" AS ENUM('active', 'paused', 'disabled');
  ALTER TABLE "agents" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."enum_agents_status";
  ALTER TABLE "agents" ALTER COLUMN "status" SET DATA TYPE "public"."enum_agents_status" USING "status"::"public"."enum_agents_status";
  ALTER TABLE "ai_usage" ALTER COLUMN "feature" SET DATA TYPE text;
  DROP TYPE "public"."enum_ai_usage_feature";
  CREATE TYPE "public"."enum_ai_usage_feature" AS ENUM('reformulate', 'understand');
  ALTER TABLE "ai_usage" ALTER COLUMN "feature" SET DATA TYPE "public"."enum_ai_usage_feature" USING "feature"::"public"."enum_ai_usage_feature";
  DROP INDEX "agents_role_id_idx";
  DROP INDEX "agents_department_idx";
  DROP INDEX "ai_usage_agent_idx";
  ALTER TABLE "agents" DROP COLUMN "role_id";
  ALTER TABLE "agents" DROP COLUMN "department";
  ALTER TABLE "agents" DROP COLUMN "cold_test_result";
  ALTER TABLE "agents" DROP COLUMN "cold_test_at";
  ALTER TABLE "agents" DROP COLUMN "cold_test_detail";
  ALTER TABLE "agent_tasks" DROP COLUMN "stage";
  ALTER TABLE "agent_tasks" DROP COLUMN "trace";
  ALTER TABLE "ai_usage" DROP COLUMN "agent_id";
  DROP TYPE "public"."enum_agents_cold_test_result";  DROP TABLE IF EXISTS "agent_run_lock";
`)
}
