import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_providers_wilaya" ADD VALUE '59';
  ALTER TYPE "public"."enum_providers_wilaya" ADD VALUE '60';
  ALTER TYPE "public"."enum_providers_wilaya" ADD VALUE '61';
  ALTER TYPE "public"."enum_providers_wilaya" ADD VALUE '62';
  ALTER TYPE "public"."enum_providers_wilaya" ADD VALUE '63';
  ALTER TYPE "public"."enum_providers_wilaya" ADD VALUE '64';
  ALTER TYPE "public"."enum_providers_wilaya" ADD VALUE '65';
  ALTER TYPE "public"."enum_providers_wilaya" ADD VALUE '66';
  ALTER TYPE "public"."enum_providers_wilaya" ADD VALUE '67';
  ALTER TYPE "public"."enum_providers_wilaya" ADD VALUE '68';
  ALTER TYPE "public"."enum_providers_wilaya" ADD VALUE '69';
  ALTER TYPE "public"."enum_classifieds_wilaya" ADD VALUE '59';
  ALTER TYPE "public"."enum_classifieds_wilaya" ADD VALUE '60';
  ALTER TYPE "public"."enum_classifieds_wilaya" ADD VALUE '61';
  ALTER TYPE "public"."enum_classifieds_wilaya" ADD VALUE '62';
  ALTER TYPE "public"."enum_classifieds_wilaya" ADD VALUE '63';
  ALTER TYPE "public"."enum_classifieds_wilaya" ADD VALUE '64';
  ALTER TYPE "public"."enum_classifieds_wilaya" ADD VALUE '65';
  ALTER TYPE "public"."enum_classifieds_wilaya" ADD VALUE '66';
  ALTER TYPE "public"."enum_classifieds_wilaya" ADD VALUE '67';
  ALTER TYPE "public"."enum_classifieds_wilaya" ADD VALUE '68';
  ALTER TYPE "public"."enum_classifieds_wilaya" ADD VALUE '69';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "providers" ALTER COLUMN "wilaya" SET DATA TYPE text;
  DROP TYPE "public"."enum_providers_wilaya";
  CREATE TYPE "public"."enum_providers_wilaya" AS ENUM('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58');
  ALTER TABLE "providers" ALTER COLUMN "wilaya" SET DATA TYPE "public"."enum_providers_wilaya" USING "wilaya"::"public"."enum_providers_wilaya";
  ALTER TABLE "classifieds" ALTER COLUMN "wilaya" SET DATA TYPE text;
  DROP TYPE "public"."enum_classifieds_wilaya";
  CREATE TYPE "public"."enum_classifieds_wilaya" AS ENUM('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58');
  ALTER TABLE "classifieds" ALTER COLUMN "wilaya" SET DATA TYPE "public"."enum_classifieds_wilaya" USING "wilaya"::"public"."enum_classifieds_wilaya";`)
}
