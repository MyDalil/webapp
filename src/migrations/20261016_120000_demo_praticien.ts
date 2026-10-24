import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'

/**
 * Praticien de démonstration, uniquement sur les environnements de test (preview, local) :
 * permet d’essayer tout le parcours de réservation. Jamais créé en production.
 */
export const up = deferred('20261016_120000_demo_praticien', async ({ payload, req }: MigrateUpArgs): Promise<void> => {
  if (process.env.VERCEL_ENV === 'production') return
  const { totalDocs } = await payload.count({ collection: 'practitioners', req, overrideAccess: true, where: { slug: { equals: 'demo-praticien' } } })
  if (totalDocs) return
  const weekdays = ['0', '1', '2', '3', '6']
  await payload.create({
    collection: 'practitioners',
    req,
    overrideAccess: true,
    data: {
      name: 'Dr Démo — praticien de test',
      title: 'Médecin généraliste (démonstration)',
      slug: 'demo-praticien',
      demo: true,
      specialties: ['medecine-generale'],
      bio: 'Fiche de démonstration pour tester la prise de rendez-vous. Aucun vrai praticien derrière : les réservations ne donnent lieu à aucune consultation.',
      languages: ['ar', 'fr', 'kab'],
      cabinetName: 'Cabinet de démonstration',
      address: 'Adresse fictive',
      city: 'Alger',
      wilaya: '16',
      modes: ['cabinet', 'visio'],
      fee: '0 DA (démo)',
      payment: 'Aucun (démo)',
      slotMinutes: 30,
      minNoticeHours: 1,
      horizonDays: 60,
      cancelNoticeHours: 1,
      weekly: [
        ...weekdays.map((day) => ({ day: day as never, start: '09:00', end: '12:00', mode: 'both' as const })),
        ...weekdays.map((day) => ({ day: day as never, start: '14:00', end: '17:00', mode: 'both' as const })),
      ],
      status: 'published',
      identityVerified: false,
    },
  })
})

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({ collection: 'practitioners', req, overrideAccess: true, where: { slug: { equals: 'demo-praticien' } } })
}
