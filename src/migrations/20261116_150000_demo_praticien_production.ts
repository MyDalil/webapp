import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'

/**
 * Praticien d’exemple, désormais aussi en production (décision de Rad, 16 nov. 2026) : les premiers médecins
 * qui visitent DALIL voient tout de suite le parcours complet — agenda, réservation, email, ajout à l’agenda, visio.
 * Marqué « Exemple », exclu du plan du site et de Google ; ses rendez-vous sont effacés après l’heure prévue.
 * Ouvert 7 jours sur 7, de 8 h à 20 h (heure d’Alger), pour être essayé à tout moment.
 */
const DAYS = ['0', '1', '2', '3', '4', '5', '6']

export const up = deferred(
  '20261116_150000_demo_praticien_production',
  async ({ payload, req }: MigrateUpArgs): Promise<void> => {
    const weekly = DAYS.map((day) => ({ day: day as never, start: '08:00', end: '20:00', mode: 'both' as const }))
    const { docs } = await payload.find({ collection: 'practitioners', req, overrideAccess: true, depth: 0, limit: 1, where: { slug: { equals: 'demo-praticien' } } })
    if (docs[0]) {
      await payload.update({ collection: 'practitioners', id: docs[0].id, req, overrideAccess: true, data: { demo: true, status: 'published', modes: ['cabinet', 'visio'], weekly } })
      return
    }
    await payload.create({
      collection: 'practitioners',
      req,
      overrideAccess: true,
      data: {
        name: 'Dr Démo — praticien d’exemple',
        title: 'Médecin généraliste (exemple)',
        slug: 'demo-praticien',
        demo: true,
        specialties: ['medecine-generale'],
        bio: 'Fiche d’exemple pour découvrir la prise de rendez-vous DALIL : agenda en ligne, confirmation par email, ajout à votre agenda, consultation en visio. Aucun vrai praticien derrière : aucune consultation n’a lieu.',
        languages: ['ar', 'fr', 'kab'],
        cabinetName: 'Cabinet d’exemple',
        address: 'Adresse d’exemple',
        city: 'Alger',
        wilaya: '16',
        modes: ['cabinet', 'visio'],
        fee: '0 DA (exemple)',
        payment: 'Aucun (exemple)',
        slotMinutes: 30,
        minNoticeHours: 1,
        horizonDays: 60,
        cancelNoticeHours: 1,
        weekly,
        status: 'published',
        identityVerified: false,
      },
    })
  },
  { reindex: false },
)

export async function down(_args: MigrateDownArgs): Promise<void> {}
