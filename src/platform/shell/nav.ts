/**
 * Navigation principale (validée par Rad, 2026-10-17) : six rubriques, chacune avec son méga-menu
 * (six entrées, une carte à la une, la barre « Trouvez rapidement »).
 * Une entrée = [lien, pictogramme, titre, sous-titre]. Toutes les pages existent.
 */
export type NavEntry = [href: string, icon: NavIcon, title: string, sub: string]
export type Rubric = {
  key: 'decouvrir' | 'vivre' | 'demarches' | 'services' | 'musulmane' | 'plus'
  label: string
  href?: string
  match: string[]
  entries: NavEntry[]
  feature: { title: string; href: string; kicker: string }
  extra?: [href: string, label: string]
}
export type NavIcon =
  | 'pin' | 'utensils' | 'camera' | 'calendar' | 'landmark' | 'mountain'
  | 'home' | 'school' | 'health' | 'bus' | 'wallet' | 'wifi'
  | 'file' | 'building' | 'briefcase' | 'plane' | 'flag' | 'phone'
  | 'wrench' | 'hammer' | 'scale' | 'truck' | 'grid'
  | 'mosque' | 'book' | 'kaaba' | 'books' | 'heart' | 'moon'
  | 'news' | 'shield' | 'upload' | 'compass'

const cat = (sector: string, category: string) => `/annuaire/${sector}?category=${encodeURIComponent(category)}`

export const RUBRICS: Rubric[] = [
  {
    key: 'decouvrir',
    label: 'Découvrir',
    href: '/explorer',
    match: ['/explorer', '/villes', '/que-faire-ce-week-end', '/annuaire/culture-nature-loisirs', '/annuaire/restaurants-gastronomie'],
    entries: [
      ['/explorer', 'pin', 'Villes & Wilayas', 'Découvrir chaque région, leurs atouts et particularités'],
      ['/annuaire/culture-nature-loisirs', 'camera', 'Tourisme', 'Sites incontournables, nature, circuits et activités'],
      [cat('culture-nature-loisirs', 'Monuments et sites historiques'), 'landmark', 'Culture & Histoire', 'Patrimoine, musées, sites historiques'],
      ['/annuaire/restaurants-gastronomie', 'utensils', 'Gastronomie', 'Restaurants, spécialités locales, produits du terroir'],
      ['/que-faire-ce-week-end', 'calendar', 'Agenda & Événements', 'Festivals, expositions, événements culturels et sportifs'],
      ['/annuaire/culture-nature-loisirs?theme=nature', 'mountain', 'Nature & Espaces', 'Plages, montagnes, parcs et espaces naturels'],
    ],
    feature: { title: 'Des lieux qui marquent votre temps', href: '/annuaire', kicker: '' },
  },
  {
    key: 'vivre',
    label: 'Vivre en Algérie',
    href: '/installation',
    match: ['/installation', '/vie-pratique', '/guides/logement', '/guides/ecole-et-famille', '/guides/sante', '/guides/transport', '/guides/budget-et-banque', '/guides/internet-et-telecoms'],
    entries: [
      ['/guides/logement', 'home', 'Logement', 'Louer, acheter, choisir son quartier'],
      ['/guides/ecole-et-famille', 'school', 'École & famille', 'Inscriptions, crèches, activités'],
      ['/guides/sante', 'health', 'Santé', 'Médecins, pharmacies, rendez-vous'],
      ['/guides/transport', 'bus', 'Transports', 'Se déplacer au quotidien'],
      ['/guides/budget-et-banque', 'wallet', 'Budget & banque', 'Comptes, paiements, devises'],
      ['/guides/internet-et-telecoms', 'wifi', 'Internet & téléphone', 'Forfaits, fibre, couverture'],
    ],
    feature: { title: 'Votre installation, étape par étape', href: '/installation', kicker: 'Vivre en Algérie' },
  },
  {
    key: 'demarches',
    label: 'Démarches',
    href: '/demarches',
    match: ['/demarches', '/guides/documents-et-demarches', '/guides/travail-et-entreprise', '/guides/preparer-son-installation', '/annuaire/administrations-services-publics'],
    entries: [
      ['/guides/documents-et-demarches', 'file', 'Documents & papiers', 'Pièces, délais, coûts'],
      [cat('administrations-services-publics', 'Administrations'), 'building', 'Administrations', 'Adresses et horaires officiels'],
      ['/guides/travail-et-entreprise', 'briefcase', 'Créer son entreprise', 'Statuts, registre, fiscalité'],
      ['/guides/preparer-son-installation', 'plane', 'S’installer depuis l’étranger', 'Douanes, résidence'],
      [cat('administrations-services-publics', 'Ambassades'), 'flag', 'Ambassades & consulats', 'Représentations et rendez-vous'],
      [cat('administrations-services-publics', 'Contacts utiles et urgences'), 'phone', 'Urgences & contacts utiles', 'Numéros essentiels'],
    ],
    feature: { title: 'Toutes les démarches', href: '/demarches', kicker: 'Démarches' },
  },
  {
    key: 'services',
    label: 'Services',
    href: '/services',
    match: ['/services', '/prestataires', '/praticiens', '/annuaire/maison-travaux', '/annuaire/droit-finance-conseil', '/annuaire/transports-mobilite'],
    entries: [
      ['/services', 'wrench', 'Services à domicile', 'Ménage, bricolage, cours…'],
      ['/praticiens', 'calendar', 'Santé : prendre rendez-vous', 'Praticiens vérifiés'],
      ['/annuaire/maison-travaux', 'hammer', 'Maison & travaux', 'Artisans, entretien'],
      ['/annuaire/droit-finance-conseil', 'scale', 'Droit & finance', 'Avocats, comptables, banques'],
      ['/annuaire/transports-mobilite', 'truck', 'Transports & mobilité', 'Déménagement, taxis'],
      ['/annuaire', 'grid', 'Annuaire complet', 'Tous les lieux et services'],
    ],
    feature: { title: 'Prestataires vérifiés par DALIL', href: '/services', kicker: 'Services' },
  },
  {
    key: 'musulmane',
    label: 'Vie musulmane',
    href: '/guides/vie-musulmane',
    match: ['/guides/vie-musulmane', '/guides/hajj-et-omra', '/annuaire/mosquees-priere'],
    entries: [
      [cat('mosquees-priere', 'Mosquées'), 'mosque', 'Mosquées & salles de prière', 'Trouver où prier'],
      [cat('mosquees-priere', 'Écoles coraniques'), 'book', 'Enseignement coranique', 'Écoles, instituts, cours'],
      ['/guides/hajj-et-omra', 'kaaba', 'Hajj & Omra', 'Préparer son projet, agences'],
      [cat('mosquees-priere', 'Librairies islamiques'), 'books', 'Librairies islamiques', 'Livres et ressources'],
      [cat('mosquees-priere', 'Associations caritatives et entraide'), 'heart', 'Entraide & associations', 'Solidarité, associations caritatives'],
      [cat('mosquees-priere', 'Pompes funèbres musulmanes et toilette mortuaire'), 'moon', 'Funérailles musulmanes', 'Pompes funèbres, toilette mortuaire'],
    ],
    feature: { title: 'Le guide de la vie musulmane', href: '/guides/vie-musulmane', kicker: 'Vie musulmane' },
  },
  {
    key: 'plus',
    label: 'Plus',
    match: ['/actualites', '/guides', '/business-emploi', '/label', '/proposer', '/boutique'],
    entries: [
      ['/actualites', 'news', 'Actualités', 'Ce qui change'],
      ['/guides', 'book', 'Guides', 'Comprendre et préparer'],
      ['/business-emploi', 'briefcase', 'Business & Emploi', 'Investir, créer, travailler'],
      ['/label', 'shield', 'Critères de vérification', 'Notre exigence de qualité'],
      ['/proposer', 'upload', 'Contribuer', 'Partager une information'],
      ['/boutique', 'compass', 'Accompagnements', 'Avancer avec un parcours clair'],
    ],
    feature: { title: 'Des lieux qui méritent votre temps', href: '/annuaire', kicker: 'À la une' },
    extra: ['/espace-pro', 'Espace professionnel'],
  },
]

/** Rubrique de la page courante (soulignée dans le menu). */
export const rubricOf = (path: string) => RUBRICS.find((r) => r.match.some((m) => path === m || path.startsWith(m + '/')))?.key ?? null
