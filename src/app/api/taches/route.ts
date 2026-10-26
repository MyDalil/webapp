import { purgeContributionPhotos } from '@/modules/messages'
import { annoncesTaxonomyRows, dailyClassifiedTasks, reindexClassifieds } from '@/modules/annonces'
import { annuaireTaxonomyRows, reindexPlaces } from '@/modules/annuaire'
import { reindexPractitioners, santeTaxonomyRows, sendReminders } from '@/modules/sante'
import { dailyServicesTasks, reindexProviders, servicesTaxonomyRows } from '@/modules/services'
import { fail, json, payload } from '@/platform/http'
import { rebuildIndex } from '@/platform/search/rebuild'
import { purgeRateLimits } from '@/platform/security/rateLimit'
import { dailyBackup } from '@/platform/backup/run'

/** Tâche planifiée Vercel quotidienne (vercel.json) : rappels, expirations, clôtures, index de recherche, sauvegarde de la base. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const ok = secret ? req.headers.get('authorization') === `Bearer ${secret}` : (req.headers.get('user-agent') ?? '').startsWith('vercel-cron')
  if (!ok) return fail('Accès refusé.', 401)
  const result = { rendezVous: await sendReminders(), services: await dailyServicesTasks(), photosProposeesSupprimees: await purgeContributionPhotos(), annonces: await dailyClassifiedTasks() }
  await purgeRateLimits()
  // Index de recherche reconstruit chaque jour : annonces expirées retirées, imports en masse pris en compte.
  const recherche = await rebuildIndex(await payload(), [...annuaireTaxonomyRows(), ...santeTaxonomyRows(), ...servicesTaxonomyRows(), ...annoncesTaxonomyRows()], { adresses: reindexPlaces, praticiens: reindexPractitioners, prestataires: reindexProviders, annonces: reindexClassifieds }).catch((e: Error) => ({ erreur: e.message }))
  const sauvegarde = await dailyBackup().catch((e: Error) => ({ erreur: e.message }))
  return json({ ...result, recherche, sauvegarde })
}
