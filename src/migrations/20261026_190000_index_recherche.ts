import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Index de recherche commun (hors schéma Payload), voir `src/platform/search/store.ts`.
 * Sans accent (unaccent), plein texte français (tsvector), fautes tolérées (pg_trgm). Rempli par `pnpm search:index`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE EXTENSION IF NOT EXISTS unaccent;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE OR REPLACE FUNCTION dalil_unaccent(text) RETURNS text
      LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
      AS $fn$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $fn$;
    CREATE TABLE IF NOT EXISTS "search_index" (
      "type" varchar(20) NOT NULL,
      "id" varchar(120) NOT NULL,
      "url" text NOT NULL,
      "title" text NOT NULL,
      "subtitle" text,
      "wilaya" varchar(4),
      "boost" real NOT NULL DEFAULT 0,
      "badge" varchar(40),
      "body" text NOT NULL DEFAULT '',
      "title_norm" text GENERATED ALWAYS AS (lower(dalil_unaccent("title"))) STORED,
      "norm" text GENERATED ALWAYS AS (lower(dalil_unaccent("title" || ' ' || coalesce("subtitle", '') || ' ' || "body"))) STORED,
      "tsv" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('french'::regconfig, lower(dalil_unaccent("title"))), 'A') ||
        setweight(to_tsvector('french'::regconfig, lower(dalil_unaccent(coalesce("subtitle", '') || ' ' || "body"))), 'B')
      ) STORED,
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("type", "id")
    );
    CREATE INDEX IF NOT EXISTS "search_index_tsv_idx" ON "search_index" USING gin ("tsv");
    CREATE INDEX IF NOT EXISTS "search_index_title_trgm_idx" ON "search_index" USING gin ("title_norm" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "search_index_norm_trgm_idx" ON "search_index" USING gin ("norm" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "search_index_wilaya_idx" ON "search_index" ("wilaya");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "search_index"; DROP FUNCTION IF EXISTS dalil_unaccent(text);`)
}
