import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'

/**
 * Prestataires d’exemple (décision de Rad, 2026-10-26 : aucune catégorie vide).
 * Un par catégorie de services, sur tous les environnements, marqués `demo`.
 * En production : badge « Exemple », demandes refusées, fiche masquée dès qu’un vrai prestataire couvre la catégorie.
 * Aucun tarif inventé : « Prix à convenir ».
 */
const EXAMPLES: [category: string, name: string, gender: 'femme' | 'homme', activities: string[], bio: string][] = [
  ['bricolage', 'Exemple — Bricolage', 'homme', ['montage-meubles', 'petits-travaux'], 'Fiche d’exemple. Un prestataire vérifié présente ici ses travaux : montage de meubles, petites réparations, fixations.'],
  ['menage', 'Exemple — Ménage', 'femme', ['menage-regulier', 'grand-menage'], 'Fiche d’exemple. Une prestataire vérifiée présente ici son expérience du ménage régulier et du grand ménage.'],
  ['demenagement', 'Exemple — Déménagement', 'homme', ['aide-demenagement', 'transport-fourgon'], 'Fiche d’exemple. Aide au chargement, transport en fourgon, montage et démontage.'],
  ['jardinage', 'Exemple — Jardinage', 'homme', ['tonte', 'taille'], 'Fiche d’exemple. Tonte, taille de haies et entretien de jardin.'],
  ['garde-enfants', 'Exemple — Garde d’enfants', 'femme', ['baby-sitting', 'sortie-ecole'], 'Fiche d’exemple. Garde d’enfants après l’école et en soirée. Casier judiciaire vérifié pour toute vraie fiche.'],
  ['garde-animaux', 'Exemple — Garde d’animaux', 'femme', ['garde-animal-domicile', 'promenade'], 'Fiche d’exemple. Garde à domicile et promenades.'],
  ['informatique', 'Exemple — Informatique', 'homme', ['depannage-pc', 'internet-wifi'], 'Fiche d’exemple. Dépannage d’ordinateur, installation internet et wifi.'],
  ['aide-domicile', 'Exemple — Aide à domicile', 'femme', ['compagnie-seniors', 'courses'], 'Fiche d’exemple. Compagnie et courses pour les personnes âgées. Casier judiciaire vérifié pour toute vraie fiche.'],
  ['cours-particuliers', 'Exemple — Cours particuliers', 'femme', ['soutien-primaire', 'soutien-cem'], 'Fiche d’exemple. Soutien scolaire au primaire et au CEM.'],
  ['cours-coraniques', 'Exemple — Cours coraniques', 'homme', ['lecture-coran', 'tajwid'], 'Fiche d’exemple. Lecture du Coran et tajwid, pour enfants et adultes.'],
  ['coach-sportif', 'Exemple — Coach sportif', 'homme', ['remise-en-forme', 'musculation'], 'Fiche d’exemple. Remise en forme et musculation, à domicile ou en extérieur.'],
]

export const up = deferred('20261026_175100_exemples_prestataires', async ({ payload, req }: MigrateUpArgs): Promise<void> => {
  const days = ['0', '1', '2', '3', '4', '6']
  for (const [category, displayName, gender, activities, bio] of EXAMPLES) {
    const slug = `exemple-${category}`
    const { totalDocs } = await payload.count({ collection: 'providers', req, overrideAccess: true, where: { slug: { equals: slug } } })
    if (totalDocs) continue
    await payload.create({
      collection: 'providers',
      req,
      overrideAccess: true,
      data: {
        displayName,
        slug,
        demo: true,
        gender,
        bio,
        languages: ['ar', 'fr'],
        clientele: 'all',
        offers: activities.map((activity) => ({ activity, pricing: 'hour', hours: 2 })),
        payment: 'Fiche d’exemple',
        wilaya: '16',
        wholeWilaya: true,
        minNoticeHours: 12,
        horizonDays: 60,
        cancelNoticeHours: 24,
        weekly: days.map((day) => ({ day: day as never, start: '09:00', end: '17:00' })),
        status: 'published',
      } as never,
    })
  }
})

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({ collection: 'providers', req, overrideAccess: true, where: { slug: { like: 'exemple-' } } })
}
