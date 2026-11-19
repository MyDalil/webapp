import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payments" ADD COLUMN "proof_file_id" integer;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_proof_file_id_claim_documents_id_fk" FOREIGN KEY ("proof_file_id") REFERENCES "public"."claim_documents"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payments_proof_file_idx" ON "payments" USING btree ("proof_file_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payments" DROP CONSTRAINT "payments_proof_file_id_claim_documents_id_fk";
  
  DROP INDEX "payments_proof_file_idx";
  ALTER TABLE "payments" DROP COLUMN "proof_file_id";`)
}
