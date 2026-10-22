import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Données géographiques de l’annuaire dans Neon (PostGIS) : point calculé à partir de lat/lng, index spatial.
 * Colonne générée (hors schéma Payload) : Payload continue d’écrire lat/lng, la base tient le point à jour.
 * Sert aux recherches de proximité (`placesNear`) sans changer l’affichage du site.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE EXTENSION IF NOT EXISTS postgis;
    ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "geom" geography(Point, 4326)
      GENERATED ALWAYS AS (
        CASE WHEN "lat" IS NOT NULL AND "lng" IS NOT NULL
          THEN ST_SetSRID(ST_MakePoint("lng"::double precision, "lat"::double precision), 4326)::geography
        END
      ) STORED;
    CREATE INDEX IF NOT EXISTS "places_geom_idx" ON "places" USING gist ("geom");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // L’extension reste installée : d’autres objets peuvent en dépendre.
  await db.execute(sql`DROP INDEX IF EXISTS "places_geom_idx"; ALTER TABLE "places" DROP COLUMN IF EXISTS "geom";`)
}
