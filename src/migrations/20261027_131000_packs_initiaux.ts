import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { GUIDES } from '@/platform/referentiel/catalog'

/**
 * Packs d’accompagnement initiaux (Rad, 2026-10-27 : « Toutes les démarches »).
 * Seul le prix du pack CCR est fixé par Rad (89 €) ; les autres restent sans prix (« Tarif annoncé au lancement »),
 * à compléter dans /admin. L’offre reste cachée en production (réglage « Cachée » par défaut).
 */
const GUIDE_ORDER = ['documents-et-demarches', 'preparer-son-installation', 'travail-et-entreprise', 'budget-et-banque', 'logement', 'ecole-et-famille', 'sante', 'transport', 'internet-et-telecoms', 'choisir-sa-ville']
const BASE = ['Appel de 30 minutes avec un conseiller', 'Liste des pièces adaptée à votre situation', 'Relecture de votre dossier sous 48 h', 'Suivi WhatsApp pendant 30 jours']

export const up = deferred('20261027_131000_packs_initiaux', async ({ payload }: MigrateUpArgs): Promise<void> => {
  const packs = [
    {
      slug: 'ccr',
      title: 'Pack Sérénité CCR',
      demarche: 'Certificat de changement de résidence (CCR)',
      guide: '/demarches/ccr',
      summary: 'Un conseiller prépare avec vous le CCR, l’inventaire et les documents du véhicule, puis relit votre dossier avant le rendez-vous au consulat.',
      includes: ['Appel de 30 minutes avec un conseiller', 'Modèle d’inventaire de vos effets', 'Relecture de votre dossier sous 48 h', 'Suivi WhatsApp pendant 30 jours'],
      priceEur: 89,
      order: 1,
    },
    ...GUIDE_ORDER.map((slug, i) => {
      const g = GUIDES.find((x) => x.slug === slug)!
      return { slug, title: `Pack Sérénité — ${g.title}`, demarche: g.title, guide: `/guides/${slug}`, summary: `Un conseiller vous aide pour « ${g.title} » et relit votre dossier.`, includes: BASE, priceEur: null, order: 10 + i }
    }),
  ]
  for (const p of packs) {
    const { totalDocs } = await payload.count({ collection: 'packs', where: { slug: { equals: p.slug } }, overrideAccess: true })
    if (totalDocs) continue
    await payload.create({ collection: 'packs', overrideAccess: true, data: { ...p, includes: p.includes.map((item) => ({ item })), active: true } })
  }
  payload.logger.info(`Packs d’accompagnement : ${packs.length} vérifiés`)
})

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DELETE FROM packs WHERE slug = ANY(${`{ccr,${GUIDE_ORDER.join(',')}}`}::text[]) AND NOT EXISTS (SELECT 1 FROM demandes_accompagnement d WHERE d.pack_id = packs.id)`)
}
