import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Colonne `_objectkey` de la médiathèque. Payload 3.93 (mise à jour du 2026-11-06) ajoute le champ caché `_objectKey`
 * aux collections stockées par @payloadcms/plugin-cloud-storage. Ce greffon n’est actif qu’avec BLOB_READ_WRITE_TOKEN :
 * en local et en CI, le champ n’existe pas, donc aucune migration ne l’a créé. En production, toute lecture complète
 * de `media` échouait (« column "_objectkey" does not exist ») : envois de photos, tâche photos-libres.
 * Migration écrite à la main, sans instantané de schéma : `IF NOT EXISTS` la rend sans effet partout où la colonne existe.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "media" DROP COLUMN IF EXISTS "_objectkey";`)
}
