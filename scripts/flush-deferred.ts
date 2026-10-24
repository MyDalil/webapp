// Exécute les migrations de données différées, une fois tout le schéma en place (voir src/platform/deferredData.ts).
// Lancé après `payload migrate` par `vercel-build` et la CI : `pnpm payload run scripts/flush-deferred.ts`.
import config from '@payload-config'
import { getPayload } from 'payload'
import { flushDeferredData } from '@/platform/deferredData'

const payload = await getPayload({ config })
const done = await flushDeferredData(payload)
payload.logger.info(done.length ? `Données différées appliquées : ${done.join(', ')}` : 'Aucune donnée différée en attente.')
process.exit(0)
