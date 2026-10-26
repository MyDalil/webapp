// Reconstruit l’index de recherche (table search_index) : `pnpm search:index`.
// Lancé par `vercel-build` après les migrations, et chaque jour par /api/taches.
// Importe directement les constructeurs de lignes : les portes des métiers chargent du code réservé au serveur Next.
import config from '@payload-config'
import { getPayload } from 'payload'
import { rebuildIndex } from '@/platform/search/rebuild'
import { annuaireTaxonomyRows, reindexPlaces } from '@/modules/annuaire/search'
import { reindexPractitioners, santeTaxonomyRows } from '@/modules/sante/search'
import { reindexProviders, servicesTaxonomyRows } from '@/modules/services/search'
import { annoncesTaxonomyRows, reindexClassifieds } from '@/modules/annonces/search'

const payload = await getPayload({ config })
const counts = await rebuildIndex(payload, [...annuaireTaxonomyRows(), ...santeTaxonomyRows(), ...servicesTaxonomyRows(), ...annoncesTaxonomyRows()], {
  adresses: reindexPlaces,
  praticiens: reindexPractitioners,
  prestataires: reindexProviders,
  annonces: reindexClassifieds,
})
payload.logger.info(`Index de recherche : ${JSON.stringify(counts)}`)
process.exit(0)
