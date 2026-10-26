import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'

/**
 * Annonces d’exemple (décision de Rad, 2026-10-26 : aucune catégorie vide).
 * Une par type, sur tous les environnements. Badge « Exemple », non contactables,
 * masquées dès qu’une vraie annonce est publiée dans le même type. Prix indicatifs, signalés comme exemples.
 */
type Ex = { sub: string; title: string; description: string; price?: number; priceMode?: string; wilaya: string; extra?: Record<string, unknown> }
const EXAMPLES: Ex[] = [
  { sub: 'immobilier:appartement', title: 'F3 lumineux près du tramway', description: 'Annonce d’exemple. Appartement de trois pièces au troisième étage, cuisine équipée, proche des écoles et des commerces. Visite sur rendez-vous.', price: 45000, priceMode: 'negotiable', wilaya: '16', extra: { deal: 'location', rooms: 3, surface: 85 } },
  { sub: 'immobilier:maison', title: 'Maison familiale avec jardin', description: 'Annonce d’exemple. Maison de cinq pièces sur deux niveaux, petit jardin, garage. Quartier calme, à proximité des écoles.', price: 32000000, priceMode: 'negotiable', wilaya: '31', extra: { deal: 'vente', rooms: 5, surface: 180 } },
  { sub: 'immobilier:terrain', title: 'Terrain constructible de 300 m²', description: 'Annonce d’exemple. Terrain plat, viabilisé, acte notarié. Accès par route goudronnée.', price: 9000000, priceMode: 'negotiable', wilaya: '15', extra: { deal: 'vente', surface: 300 } },
  { sub: 'immobilier:local', title: 'Local commercial en rez-de-chaussée', description: 'Annonce d’exemple. Local de 60 m² avec vitrine sur rue passante, adapté à un commerce ou un bureau.', price: 60000, priceMode: 'fixed', wilaya: '25', extra: { deal: 'location', surface: 60 } },
  { sub: 'immobilier:chambre', title: 'Chambre meublée pour étudiant', description: 'Annonce d’exemple. Chambre meublée dans un appartement calme, cuisine partagée, proche de l’université.', price: 15000, priceMode: 'fixed', wilaya: '19', extra: { deal: 'location', rooms: 1, furnished: true } },
  { sub: 'emploi:offre', title: 'Vendeur ou vendeuse en boutique', description: 'Annonce d’exemple. Boutique de prêt-à-porter recherche une personne souriante et ponctuelle. Expérience souhaitée, formation assurée.', priceMode: 'on-request', wilaya: '09', extra: { contract: 'cdi', sector: 'Commerce' } },
  { sub: 'emploi:demande', title: 'Comptable cherche un poste', description: 'Annonce d’exemple. Licence en finance, cinq ans d’expérience en cabinet. Disponible rapidement, à temps plein ou partiel.', priceMode: 'on-request', wilaya: '16', extra: { contract: 'cdi', sector: 'Comptabilité' } },
  { sub: 'emploi:stage', title: 'Stage en marketing digital', description: 'Annonce d’exemple. Agence de communication accueille un stagiaire de fin d’études pendant trois mois. Réseaux sociaux et création de contenus.', priceMode: 'on-request', wilaya: '31', extra: { sector: 'Communication' } },
  { sub: 'emploi:mission', title: 'Traduction arabe-français d’un dossier', description: 'Annonce d’exemple. Mission ponctuelle : traduction d’un dossier administratif d’une vingtaine de pages.', price: 20000, priceMode: 'negotiable', wilaya: '23', extra: { contract: 'independant', sector: 'Traduction' } },
  { sub: 'vehicules:voiture', title: 'Citadine 2019, entretien suivi', description: 'Annonce d’exemple. Citadine essence, carnet d’entretien à jour, carte grise au nom du vendeur. Essai possible.', price: 2100000, priceMode: 'negotiable', wilaya: '19', extra: { brand: 'Exemple', model: 'Citadine', year: 2019, mileage: 85000, fuel: 'essence', gearbox: 'manuelle', condition: 'bon' } },
  { sub: 'vehicules:moto', title: 'Scooter 125 cm³, très bon état', description: 'Annonce d’exemple. Scooter urbain, faible consommation, pneus récents.', price: 280000, priceMode: 'negotiable', wilaya: '16', extra: { brand: 'Exemple', year: 2021, mileage: 12000, fuel: 'essence', condition: 'tres-bon' } },
  { sub: 'vehicules:utilitaire', title: 'Fourgon utilitaire, idéal livraisons', description: 'Annonce d’exemple. Fourgon diesel, grand volume de chargement, papiers en règle.', price: 3400000, priceMode: 'negotiable', wilaya: '05', extra: { brand: 'Exemple', year: 2017, mileage: 160000, fuel: 'diesel', gearbox: 'manuelle', condition: 'bon' } },
  { sub: 'vehicules:pieces', title: 'Jeu de quatre jantes alliage', description: 'Annonce d’exemple. Jantes 16 pouces en bon état, sans voile. Remise en main propre.', price: 60000, priceMode: 'negotiable', wilaya: '31', extra: { condition: 'bon' } },
  { sub: 'objets:maison', title: 'Réfrigérateur combiné, très bon état', description: 'Annonce d’exemple. Réfrigérateur avec congélateur, classe énergétique économe, fonctionne parfaitement.', price: 55000, priceMode: 'negotiable', wilaya: '16', extra: { condition: 'tres-bon' } },
  { sub: 'objets:high-tech', title: 'Smartphone 128 Go avec chargeur', description: 'Annonce d’exemple. Téléphone débloqué, écran sans rayure, batterie en bon état, boîte d’origine.', price: 45000, priceMode: 'negotiable', wilaya: '16', extra: { condition: 'tres-bon' } },
  { sub: 'objets:mode', title: 'Manteau d’hiver, taille M', description: 'Annonce d’exemple. Manteau chaud porté une saison, propre et sans défaut.', price: 6000, priceMode: 'fixed', wilaya: '25', extra: { condition: 'bon' } },
  { sub: 'objets:enfants', title: 'Poussette pliable avec habillage pluie', description: 'Annonce d’exemple. Poussette légère, pliage en une main, habillage pluie inclus.', price: 12000, priceMode: 'negotiable', wilaya: '06', extra: { condition: 'bon' } },
  { sub: 'objets:sport', title: 'Vélo de ville, taille adulte', description: 'Annonce d’exemple. Vélo révisé, freins et pneus récents, panier avant.', price: 18000, priceMode: 'negotiable', wilaya: '13', extra: { condition: 'bon' } },
  { sub: 'objets:livres', title: 'Lot de livres scolaires du primaire', description: 'Annonce d’exemple. Manuels et cahiers d’exercices, bon état, idéal pour la rentrée.', priceMode: 'free', wilaya: '35', extra: { condition: 'bon' } },
  { sub: 'objets:autres', title: 'Machine à coudre électrique', description: 'Annonce d’exemple. Machine à coudre avec pédale et accessoires, peu servie.', price: 15000, priceMode: 'negotiable', wilaya: '10', extra: { condition: 'tres-bon' } },
]

export const up = deferred('20261026_175000_exemples_annonces', async ({ payload, req }: MigrateUpArgs): Promise<void> => {
  for (const e of EXAMPLES) {
    const slug = `exemple-${e.sub.replace(':', '-')}`
    const { totalDocs } = await payload.count({ collection: 'classifieds', req, overrideAccess: true, where: { slug: { equals: slug } } })
    if (totalDocs) continue
    await payload.create({
      collection: 'classifieds',
      req,
      overrideAccess: true,
      context: { skipRevalidate: true },
      data: {
        title: e.title,
        slug,
        category: e.sub.split(':')[0],
        subcategory: e.sub,
        description: e.description,
        price: e.priceMode === 'free' ? 0 : (e.price ?? null),
        priceMode: e.priceMode ?? 'fixed',
        wilaya: e.wilaya.replace(/^0/, ''),
        ...e.extra,
        authorName: 'Exemple DALIL',
        authorKind: 'particulier',
        example: true,
        status: 'published',
      } as never,
    })
  }
})

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({ collection: 'classifieds', req, overrideAccess: true, where: { example: { equals: true } } })
}
