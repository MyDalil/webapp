import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Point de restauration avant la réécriture des noms d’adresses (20261119_190000_noms_accents, différée).
 * Copie id, name, name_en, name_ar de « places » dans le schéma « sauvegardes » (hors du schéma géré par Payload).
 * Tourne pendant `payload migrate`, donc AVANT l’étape différée qui réécrit les noms. Ne remplace jamais une copie existante.
 * Restauration (règle 6) :
 *   UPDATE places p SET name = b.name, name_en = b.name_en, name_ar = b.name_ar
 *   FROM sauvegardes.places_noms_20261119 b WHERE p.id = b.id;
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS sauvegardes`)
  await db.execute(sql`CREATE TABLE IF NOT EXISTS sauvegardes.places_noms_20261119 AS SELECT id, name, name_en, name_ar, now() AS copied_at FROM places`)
}

/** La copie est gardée : un retour arrière ne doit jamais effacer un point de restauration. */
export async function down(_: MigrateDownArgs): Promise<void> {}
