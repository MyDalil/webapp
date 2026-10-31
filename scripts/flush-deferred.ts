// Exécute les migrations de données différées, une fois tout le schéma en place (voir src/platform/deferredData.ts).
// Lancé après `payload migrate` par `vercel-build` et la CI : `pnpm payload run scripts/flush-deferred.ts`.
import config from '@payload-config'
import { getPayload } from 'payload'
import { writeFileSync } from 'node:fs'
import { flushDeferredData } from '@/platform/deferredData'

const payload = await getPayload({ config })
const done = await flushDeferredData(payload)
// Des données ont été écrites en masse (sans les crochets) : l’index de recherche doit être reconstruit après.
if (done.length) writeFileSync('.reindex-needed', done.join('\n'))
payload.logger.info(done.length ? `Données différées appliquées : ${done.join(', ')}` : 'Aucune donnée différée en attente.')
process.exit(0)
