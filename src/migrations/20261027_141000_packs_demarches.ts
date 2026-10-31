import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'

/**
 * Packs des démarches phares (fiches sourcées /demarches/passeport et /demarches/auto-entrepreneur).
 * Sans prix (« Tarif annoncé au lancement ») : seul Rad fixe un prix, dans /admin. Passeport : prix par personne.
 */
const BASE = ['Appel de 30 minutes avec un conseiller', 'Liste des pièces adaptée à votre situation', 'Relecture de votre dossier sous 48 h', 'Suivi WhatsApp pendant 30 jours']

export const up = deferred('20261027_141000_packs_demarches', async ({ payload }: MigrateUpArgs): Promise<void> => {
  const packs = [
    { slug: 'passeport', title: 'Pack Sérénité Passeport', demarche: 'Passeport biométrique', guide: '/demarches/passeport', summary: 'Un conseiller vérifie vos pièces et votre formulaire avant le rendez-vous.', includes: BASE, perPerson: true, order: 2 },
    { slug: 'auto-entrepreneur', title: 'Pack Sérénité Auto-entrepreneur', demarche: 'Devenir auto-entrepreneur', guide: '/demarches/auto-entrepreneur', summary: 'Un conseiller vous aide à choisir votre activité et à réussir votre inscription.', includes: BASE, perPerson: false, order: 3 },
  ]
  for (const p of packs) {
    const { totalDocs } = await payload.count({ collection: 'packs', where: { slug: { equals: p.slug } }, overrideAccess: true })
    if (totalDocs) continue
    await payload.create({ collection: 'packs', overrideAccess: true, data: { ...p, includes: p.includes.map((item) => ({ item })), active: true } })
  }
})

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DELETE FROM packs WHERE slug IN ('passeport', 'auto-entrepreneur') AND NOT EXISTS (SELECT 1 FROM demandes_accompagnement d WHERE d.pack_id = packs.id)`)
}
