import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'

/**
 * Prestataire de démonstration, uniquement sur les environnements de test (preview, local) :
 * permet d’essayer tout le parcours de demande, de messagerie et d’avis. Jamais créé en production.
 */
export const up = deferred('20261016_180000_demo_prestataire', async ({ payload, req }: MigrateUpArgs): Promise<void> => {
  if (process.env.VERCEL_ENV === 'production') return
  const { totalDocs } = await payload.count({ collection: 'providers', req, overrideAccess: true, where: { slug: { equals: 'demo-prestataire' } } })
  if (totalDocs) return
  const days = ['0', '1', '2', '3', '4', '6']
  await payload.create({
    collection: 'providers',
    req,
    overrideAccess: true,
    data: {
      displayName: 'Démo — prestataire de test',
      slug: 'demo-prestataire',
      demo: true,
      gender: 'femme',
      bio: 'Fiche de démonstration pour tester les demandes de service. Aucun vrai prestataire derrière : aucune mission n’aura lieu.',
      languages: ['ar', 'fr', 'kab'],
      clientele: 'all',
      experienceYears: 5,
      offers: [
        { activity: 'menage-regulier', pricing: 'hour', price: 1200 },
        { activity: 'montage-meubles', pricing: 'flat', price: 3000, unit: 'par meuble', hours: 2 },
        { activity: 'tajwid', pricing: 'flat', price: 1500, unit: 'la séance', hours: 1 },
      ],
      payment: 'Aucun (démo)',
      wilaya: '16',
      wholeWilaya: true,
      minNoticeHours: 1,
      horizonDays: 60,
      cancelNoticeHours: 1,
      weekly: [...days.map((day) => ({ day: day as never, start: '09:00', end: '13:00' })), ...days.map((day) => ({ day: day as never, start: '14:00', end: '18:00' }))],
      status: 'published',
    },
  })
})

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({ collection: 'providers', req, overrideAccess: true, where: { slug: { equals: 'demo-prestataire' } } })
}
