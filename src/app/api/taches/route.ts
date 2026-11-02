import { purgeContributionPhotos } from '@/modules/messages'
import { annoncesTaxonomyRows, dailyClassifiedTasks, reindexClassifieds } from '@/modules/annonces'
import { annuaireTaxonomyRows, reindexPlaces } from '@/modules/annuaire'
import { reindexPractitioners, santeTaxonomyRows, sendReminders } from '@/modules/sante'
import { dailyServicesTasks, reindexProviders, servicesTaxonomyRows } from '@/modules/services'
import { fail, json, payload } from '@/platform/http'
import { rebuildIndex } from '@/platform/search/rebuild'
import { reindexProcedures, reindexRepresentations } from '@/modules/contenus'
import { purgeRateLimits } from '@/platform/security/rateLimit'
import { dailyBackup } from '@/platform/backup/run'

import { runTask, type TaskOutcome } from '@/platform/tasks/run'
import { recordError } from '@/platform/monitoring/errors'

export const maxDuration = 300

/**
 * Tâche planifiée Vercel quotidienne (vercel.json) : rappels, expirations, clôtures, index de recherche, sauvegarde.
 * Authentification : `Authorization: Bearer <CRON_SECRET>` (Vercel l’envoie seul). Sans secret configuré : refus systématique,
 * jamais de confiance accordée à un en-tête déclaratif (user-agent).
 * Chaque tâche est isolée (une panne n’empêche pas les suivantes), verrouillée et rejouable une fois par jour (`task-runs`).
 * Réponse 500 si une tâche échoue : un appel réussi prouve que tout a réussi.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    await recordError(new Error('CRON_SECRET absent : tâche quotidienne refusée'), { route: '/api/taches', routeType: 'tache' })
    return fail('Tâche désactivée : CRON_SECRET absent.', 503)
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) return fail('Accès refusé.', 401)
  const out: Record<string, TaskOutcome> = {}
  out.rendezVous = await runTask('rappels-rendez-vous', sendReminders, { failed: (r) => ((r as { failed?: number }).failed ? `${(r as { failed: number }).failed} rappel(s) non acceptés par le fournisseur` : null) })
  out.services = await runTask('services', dailyServicesTasks)
  out.photosProposees = await runTask('photos-proposees', purgeContributionPhotos)
  out.annonces = await runTask('annonces', dailyClassifiedTasks)
  out.limitesDeDebit = await runTask('limites-de-debit', purgeRateLimits)
  // Index de recherche : tenu à jour à chaque enregistrement (crochets des métiers). Reconstruction complète une fois
  // par semaine (vendredi, heure d’Alger), filet de sécurité qui économise le calcul de la base.
  const friday = new Date().toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'Africa/Algiers' }) === 'Friday'
  if (friday)
    out.recherche = await runTask('index-recherche', async () =>
      rebuildIndex(await payload(), [...annuaireTaxonomyRows(), ...santeTaxonomyRows(), ...servicesTaxonomyRows(), ...annoncesTaxonomyRows()], { adresses: reindexPlaces, praticiens: reindexPractitioners, prestataires: reindexProviders, annonces: reindexClassifieds, demarches: reindexProcedures, consulats: reindexRepresentations }),
    )
  out.sauvegarde = await runTask('sauvegarde', dailyBackup, { failed: (r) => ((r as { ignoree?: string }).ignoree ? `sauvegarde non faite : ${(r as { ignoree: string }).ignoree}` : null) })
  const failed = Object.entries(out).filter(([, o]) => o.status === 'failed').map(([k]) => k)
  return json({ ok: failed.length === 0, echecs: failed, taches: out }, failed.length ? 500 : 200)
}
