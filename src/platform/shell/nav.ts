/**
 * Navigation principale : six univers (audit du 2026-11-02, structure validée par Rad le même jour) dans cet ordre :
 * Santé, Services, Annonces, Vie musulmane, Découvrir, Vie pratique. Chacun avec son méga-menu
 * (six entrées, une carte à la une, la barre « Trouvez rapidement »).
 * Une entrée = [lien, pictogramme, titre, sous-titre]. Toutes les pages existent.
 */
export type NavEntry = [href: string, icon: NavIcon, title: string, sub: string]
export type Rubric = {
  key: 'sante' | 'services' | 'annonces' | 'musulmane' | 'decouvrir' | 'vivre'
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
  | 'news' | 'shield' | 'upload' | 'compass' | 'car' | 'tag'

const cat = (sector: string, category: string) => `/annuaire/${sector}?category=${encodeURIComponent(category)}`

export const RUBRICS: Rubric[] = [
  {
    key: 'sante',
    label: 'Santé',
    href: '/praticiens',
    match: ['/praticiens', '/annuaire/sante-soins', '/guides/sante'],
    entries: [
      ['/praticiens', 'health', 'Médecins & praticiens', 'Coordonnées, rendez-vous si proposé'],
      [cat('sante-soins', 'Pharmacies'), 'heart', 'Pharmacies', 'Trouver une pharmacie proche'],
      [cat('sante-soins', 'Laboratoires'), 'file', 'Laboratoires', 'Analyses médicales'],
      ['/annuaire/sante-soins', 'building', 'Cliniques & hôpitaux', 'Établissements de soins'],
      [cat('sante-soins', 'Vétérinaires'), 'pin', 'Vétérinaires', 'Cabinets et cliniques vétérinaires'],
      [cat('administrations-services-publics', 'Contacts utiles et urgences'), 'phone', 'Urgences', 'Numéros d’urgence'],
    ],
    feature: { title: 'Trouver un professionnel de santé', href: '/praticiens', kicker: 'Santé' },
  },
  {
    key: 'services',
    label: 'Services',
    href: '/services',
    match: ['/services', '/prestataires', '/annuaire/maison-travaux', '/annuaire/droit-finance-conseil', '/annuaire/transports-mobilite'],
    entries: [
      ['/services/bricolage', 'hammer', 'Travaux & dépannage', 'Bricolage, réparations, artisans'],
      ['/services/menage', 'wrench', 'Ménage & entretien', 'Ménage, repassage, jardinage'],
      ['/services/demenagement', 'truck', 'Déménagement', 'Transport, montage de meubles'],
      ['/services/aide-domicile', 'heart', 'Famille & aide à domicile', 'Garde d’enfants, aînés, animaux'],
      ['/services/cours-particuliers', 'book', 'Cours & informatique', 'Cours particuliers, dépannage informatique'],
      ['/annuaire/droit-finance-conseil', 'scale', 'Droit & conseil', 'Avocats, notaires, comptables'],
    ],
    feature: { title: 'Décrire mon besoin', href: '/services', kicker: 'Services' },
  },
  {
    key: 'annonces',
    label: 'Annonces',
    href: '/annonces',
    match: ['/annonces', '/business-emploi'],
    entries: [
      ['/annonces/immobilier', 'home', 'Immobilier', 'Vendre, louer, colocation'],
      ['/annonces/emploi', 'briefcase', 'Emploi', 'Offres, candidatures, stages'],
      ['/annonces/vehicules', 'car', 'Véhicules', 'Voitures, motos, pièces'],
      ['/annonces/objets', 'tag', 'Objets', 'Maison, high-tech, mode, enfants'],
      ['/annonces/deposer', 'upload', 'Déposer une annonce', 'Gratuit, contrôlée par DALIL'],
      ['/mon-compte#annonces', 'news', 'Mes annonces et messages', 'Suivre, renouveler, répondre'],
    ],
    feature: { title: 'Toutes les annonces', href: '/annonces', kicker: 'Annonces' },
  },
  {
    key: 'musulmane',
    label: 'Vie musulmane',
    href: '/vie-musulmane',
    match: ['/vie-musulmane', '/guides/vie-musulmane', '/guides/hajj-et-omra', '/annuaire/mosquees-priere'],
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
    key: 'decouvrir',
    label: 'Découvrir',
    href: '/explorer',
    match: ['/explorer', '/villes', '/que-faire-ce-week-end', '/annuaire/culture-nature-loisirs', '/annuaire/restaurants-gastronomie', '/annuaire/hebergement-sejours', '/guides'],
    entries: [
      ['/explorer#territoires', 'pin', 'Villes & régions', 'Chaque région, ses atouts et particularités'],
      [cat('culture-nature-loisirs', 'Monuments et sites historiques'), 'landmark', 'Patrimoine & musées', 'Sites historiques, musées, cités antiques'],
      ['/annuaire/culture-nature-loisirs?theme=nature', 'mountain', 'Nature & plages', 'Plages, montagnes, parcs, oasis'],
      ['/annuaire/restaurants-gastronomie', 'utensils', 'Restaurants & cafés', 'Tables, cafés, spécialités locales'],
      ['/annuaire/hebergement-sejours', 'home', 'Séjours', 'Hôtels, gîtes, maisons d’hôtes'],
      ['/que-faire-ce-week-end', 'calendar', 'Agenda & week-end', 'Sorties, festivals, événements datés'],
    ],
    feature: { title: 'Que faire ce week-end ?', href: '/que-faire-ce-week-end', kicker: 'Découvrir' },
    extra: ['/guides', 'Tous les guides'],
  },
  {
    key: 'vivre',
    label: 'Vie pratique',
    href: '/demarches',
    match: ['/demarches', '/installation', '/vie-pratique', '/guides/documents-et-demarches', '/guides/travail-et-entreprise', '/guides/preparer-son-installation', '/guides/logement', '/guides/ecole-et-famille', '/guides/transport', '/guides/budget-et-banque', '/guides/internet-et-telecoms', '/annuaire/administrations-services-publics'],
    entries: [
      ['/installation', 'plane', 'M’installer', 'Préparer son arrivée en Algérie'],
      ['/demarches', 'file', 'Papiers & consulats', 'Démarches officielles, administrations, consulats'],
      ['/guides/logement', 'home', 'Logement & quartier', 'Louer, acheter, choisir son quartier'],
      ['/guides/ecole-et-famille', 'school', 'École & famille', 'Inscriptions, crèches, activités'],
      ['/guides/travail-et-entreprise', 'briefcase', 'Travail & entreprise', 'Emploi, statuts, registre, fiscalité'],
      ['/guides/budget-et-banque', 'wallet', 'Banque, télécoms & transports', 'Comptes, forfaits, se déplacer'],
    ],
    feature: { title: 'Toutes les démarches', href: '/demarches', kicker: 'Vie pratique' },
  },
]

/** Tuiles de la page /demarches (inchangées depuis l’ancienne rubrique Démarches). */
export const DEMARCHES_ENTRIES: NavEntry[] = [
  ['/guides/documents-et-demarches', 'file', 'Documents & papiers', 'Pièces, délais, coûts'],
  [cat('administrations-services-publics', 'Administrations'), 'building', 'Administrations', 'Adresses et horaires officiels'],
  ['/guides/travail-et-entreprise', 'briefcase', 'Créer son entreprise', 'Statuts, registre, fiscalité'],
  ['/guides/preparer-son-installation', 'plane', 'S’installer depuis l’étranger', 'Douanes, résidence'],
  [cat('administrations-services-publics', 'Ambassades'), 'flag', 'Ambassades & consulats', 'Représentations et rendez-vous'],
  [cat('administrations-services-publics', 'Contacts utiles et urgences'), 'phone', 'Urgences & contacts utiles', 'Numéros essentiels'],
]

/** Rubrique de la page courante (soulignée dans le menu). */
export const rubricOf = (path: string) => RUBRICS.find((r) => r.match.some((m) => path === m || path.startsWith(m + '/')))?.key ?? null
