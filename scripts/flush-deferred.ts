// Exécute les migrations de données différées, une fois tout le schéma en place (voir src/platform/deferredData.ts).
// Lancé après `payload migrate` par `vercel-build` et la CI : `pnpm payload run scripts/flush-deferred.ts`.
import config from '@payload-config'
import { getPayload } from 'payload'
import { writeFileSync } from 'node:fs'
import { flushDeferredData, needsReindex } from '@/platform/deferredData'
// Charge les migrations : chacune enregistre ses données différées (deferred). Avant, payload.config les importait
// par `prodMigrations` ; depuis son retrait (19 nov. 2026), ce script doit les charger lui-même.
import '@/migrations'

const payload = await getPayload({ config })
const done = await flushDeferredData(payload)
// Des données ont été écrites en masse (sans les crochets) : l’index de recherche doit être reconstruit après.
if (needsReindex(done)) writeFileSync('.reindex-needed', done.join('\n'))
payload.logger.info(done.length ? `Données différées appliquées : ${done.join(', ')}` : 'Aucune donnée différée en attente.')
process.exit(0)
