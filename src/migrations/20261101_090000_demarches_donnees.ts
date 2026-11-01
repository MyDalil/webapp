import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { importOfficial } from '@/modules/contenus/officiel/importData'
import demarches from '@/modules/contenus/officiel/data/demarches.json'
import plateformes from '@/modules/contenus/officiel/data/plateformes.json'
import representations from '@/modules/contenus/officiel/data/representations.json'

/**
 * Démarches officielles, services en ligne de l’État et ambassades/consulats d’Algérie (collecte du 1er novembre 2026,
 * sources officielles datées). Mise à jour par identifiant : rejouable sans doublon. Garde-fous : src/rubriques/demarches/.
 */
export const up = deferred('20261101_090000_demarches_donnees', async ({ payload }: MigrateUpArgs): Promise<void> => {
  const n = await importOfficial(payload, { ...demarches, ...plateformes, ...representations } as never)
  payload.logger.info(`Démarches officielles : ${JSON.stringify(n)}`)
})

export async function down(_: MigrateDownArgs): Promise<void> {
  // Données éditoriales : jamais supprimées automatiquement (les fiches retirées passent au statut « Retirée »).
}
