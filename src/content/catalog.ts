// Généré par scripts/extract-catalog.mjs depuis le prototype DALIL — données de référence.
export type Sector = { slug: string; title: string; description: string; categories: string[]; criteria: string[]; guides: string[] }
export type GuideRef = { slug: string; title: string; category: string; summary: string; keywords: string[]; sourceIds: string[]; steps: string[] }
export const SECTORS: Sector[] = [
 {
  "slug": "restaurants-gastronomie",
  "title": "Restaurants & Gastronomie",
  "description": "Choisir une table, une pause gourmande ou un traiteur.",
  "categories": [
   "Restaurants",
   "Restaurants familiaux",
   "Cafés",
   "Salons de thé",
   "Pâtisseries",
   "Glaciers",
   "Traiteurs"
  ],
  "criteria": [
   "Hygiène",
   "Goût",
   "Qualité des produits",
   "Service et accueil",
   "Rapidité",
   "Prix",
   "Quantité et garnitures",
   "Décoration et confort",
   "Sanitaires",
   "Bruit",
   "Capacité",
   "Climatisation",
   "Salle familiale",
   "Terrasse",
   "Box",
   "Desserts et spécialités",
   "Stationnement",
   "Espace de prière",
   "Jeux pour enfants",
   "Accessibilité",
   "Originalité",
   "Sans alcool",
   "Menu enfants"
  ],
  "guides": [
   "restaurants"
  ]
 },
 {
  "slug": "education-formation",
  "title": "Éducation & Formation",
  "description": "Comparer les parcours, les programmes et les conditions de scolarité.",
  "categories": [
   "Crèches",
   "Écoles",
   "Universités",
   "Formation professionnelle",
   "Écoles de langues"
  ],
  "criteria": [
   "Programme",
   "Niveaux et âges",
   "Langues enseignées",
   "Autorisations",
   "Encadrement",
   "Sécurité",
   "Frais de scolarité",
   "Transport scolaire",
   "Restauration",
   "Accessibilité"
  ],
  "guides": [
   "ecole-et-famille"
  ]
 },
 {
  "slug": "sante-soins",
  "title": "Santé & Soins",
  "description": "Identifier les structures de soins et les professionnels adaptés à son besoin.",
  "categories": [
   "Médecins",
   "Cliniques",
   "Hôpitaux",
   "Laboratoires",
   "Pharmacies",
   "Hijama"
  ],
  "criteria": [
   "Spécialités",
   "Qualifications et autorisations",
   "Horaires",
   "Accessibilité",
   "Prise de rendez-vous",
   "Tarifs annoncés",
   "Accueil",
   "Équipements"
  ],
  "guides": [
   "sante",
   "pharmacies"
  ]
 },
 {
  "slug": "bien-etre-sport",
  "title": "Bien-être & Sport",
  "description": "Prendre soin de soi et trouver une activité régulière.",
  "categories": [
   "Spas",
   "Hammams",
   "Soins esthétiques",
   "Salles de sport",
   "Clubs sportifs",
   "Installations sportives",
   "Salles de sport pour femmes",
   "Piscines non mixtes"
  ],
  "criteria": [
   "Hygiène",
   "Encadrement",
   "Espaces et intimité",
   "Équipements",
   "Horaires",
   "Tarifs",
   "Accessibilité",
   "Horaires hommes / femmes"
  ],
  "guides": [
   "services-du-quotidien"
  ]
 },
 {
  "slug": "logement-immobilier",
  "title": "Logement & Immobilier",
  "description": "Trouver les interlocuteurs pour louer, acheter ou gérer un logement.",
  "categories": [
   "Agences immobilières",
   "Programmes immobiliers",
   "Gestion locative"
  ],
  "criteria": [
   "Zone couverte",
   "Prestations",
   "Honoraires",
   "Identité professionnelle",
   "Documents disponibles",
   "Accessibilité"
  ],
  "guides": [
   "logement"
  ]
 },
 {
  "slug": "hebergement-sejours",
  "title": "Hébergement & Séjours",
  "description": "Préparer un séjour et identifier les opérateurs de voyage.",
  "categories": [
   "Hôtels",
   "Résidences",
   "Maisons d’hôtes",
   "Agences de voyages",
   "Omra",
   "Hajj"
  ],
  "criteria": [
   "Autorisation",
   "Confort",
   "Hygiène",
   "Prestations incluses",
   "Tarifs",
   "Conditions d’annulation",
   "Chambres familiales",
   "Accessibilité",
   "Sans alcool",
   "Espace de prière",
   "Piscine non mixte"
  ],
  "guides": [
   "decouvrir-algerie"
  ]
 },
 {
  "slug": "culture-nature-loisirs",
  "title": "Culture, Nature & Loisirs",
  "description": "Des lieux pour apprendre, se promener et partager une sortie.",
  "categories": [
   "Musées",
   "Bibliothèques",
   "Parcs",
   "Plages",
   "Jardins",
   "Activités familiales"
  ],
  "criteria": [
   "Horaires",
   "Conditions d’accès",
   "Public et âges",
   "Tarifs",
   "Sécurité",
   "Sanitaires",
   "Stationnement",
   "Accessibilité"
  ],
  "guides": [
   "sorties-en-famille",
   "decouvrir-algerie"
  ]
 },
 {
  "slug": "mosquees-priere",
  "title": "Mosquées & Vie musulmane",
  "description": "Prier, apprendre et vivre sa foi au quotidien : mosquées, enseignement, librairies et services.",
  "categories": [
   "Mosquées",
   "Salles de prière",
   "Écoles coraniques",
   "Instituts d’arabe et de sciences islamiques",
   "Librairies islamiques",
   "Associations caritatives et entraide",
   "Pompes funèbres musulmanes et toilette mortuaire",
   "Agences Omra & Hajj"
  ],
  "criteria": [
   "Localisation",
   "Accès",
   "Prière du vendredi",
   "Espace femmes",
   "Ablutions",
   "Cours et halaqat",
   "Parking",
   "Accessibilité",
   "Horaires confirmés"
  ],
  "guides": [
   "mosquees-et-priere"
  ]
 },
 {
  "slug": "commerces-achats",
  "title": "Commerces & Achats",
  "description": "Trouver les commerces utiles près de chez soi.",
  "categories": [
   "Librairies",
   "Alimentation",
   "Habillement",
   "Équipement de la maison",
   "Mode modeste",
   "Moutons de l’Aïd"
  ],
  "criteria": [
   "Produits",
   "Qualité",
   "Prix",
   "Accueil",
   "Horaires",
   "Livraison",
   "Accessibilité"
  ],
  "guides": [
   "services-du-quotidien"
  ]
 },
 {
  "slug": "transports-mobilite",
  "title": "Transports & Mobilité",
  "description": "Organiser ses trajets et le transport de ses biens.",
  "categories": [
   "Transporteurs",
   "Location de véhicules",
   "Déménagement",
   "Services automobiles"
  ],
  "criteria": [
   "Zone couverte",
   "Autorisations",
   "Disponibilité",
   "Tarifs",
   "Assurance",
   "Accessibilité"
  ],
  "guides": [
   "transport"
  ]
 },
 {
  "slug": "maison-travaux",
  "title": "Maison & Travaux",
  "description": "Choisir les compétences pour construire, rénover et entretenir.",
  "categories": [
   "Architectes",
   "Artisans",
   "Construction",
   "Rénovation",
   "Entretien"
  ],
  "criteria": [
   "Qualifications",
   "Zone couverte",
   "Références",
   "Devis",
   "Délais",
   "Garanties"
  ],
  "guides": [
   "logement"
  ]
 },
 {
  "slug": "droit-finance-conseil",
  "title": "Droit, Finance & Conseil",
  "description": "Trouver le bon interlocuteur pour une question professionnelle ou personnelle.",
  "categories": [
   "Avocats",
   "Notaires",
   "Comptables",
   "Banques",
   "Conseil aux entreprises"
  ],
  "criteria": [
   "Qualifications",
   "Domaines d’intervention",
   "Honoraires",
   "Confidentialité",
   "Langues",
   "Accessibilité"
  ],
  "guides": [
   "travail-et-entreprise",
   "budget-et-banque"
  ]
 },
 {
  "slug": "administrations-services-publics",
  "title": "Administrations & Services publics",
  "description": "Identifier le service compétent et les contacts utiles.",
  "categories": [
   "Administrations",
   "Consulats",
   "Services municipaux",
   "Contacts utiles et urgences"
  ],
  "criteria": [
   "Compétence territoriale",
   "Adresse officielle",
   "Horaires",
   "Rendez-vous",
   "Documents demandés",
   "Accessibilité"
  ],
  "guides": [
   "documents-et-demarches"
  ]
 }
]
export const GUIDES: GuideRef[] = [
 {
  "slug": "preparer-son-installation",
  "title": "Préparer son installation",
  "category": "Installation",
  "summary": "Clarifier son projet, organiser son départ et préparer ses premiers mois.",
  "keywords": [
   "hijra",
   "départ",
   "projet",
   "famille"
  ],
  "sourceIds": [],
  "steps": [
   "Notez ce qui motive votre installation, votre horizon et les contraintes de votre foyer.",
   "Repérez les documents dont vous disposez et les démarches à confirmer selon votre nationalité et votre situation.",
   "Comparez plusieurs villes en fonction de votre quotidien : logement, école, soins, travail et déplacements.",
   "Prévoyez un séjour de repérage si possible, puis organisez un budget et une solution de logement à l’arrivée.",
   "Préparez vos premières semaines : contacts utiles, rendez-vous, scolarité et continuité des soins."
  ]
 },
 {
  "slug": "choisir-sa-ville",
  "title": "Choisir sa ville et son quartier",
  "category": "Territoires",
  "summary": "Comparer un cadre de vie concret, au-delà des photos et des impressions.",
  "keywords": [
   "wilaya",
   "ville",
   "quartier",
   "climat",
   "région"
  ],
  "sourceIds": [
   "DZ-WILAYAS",
   "DZ-WILAYAS-NAMES"
  ],
  "steps": [
   "Retenez deux ou trois villes correspondant à votre projet.",
   "Pour chacune, mesurez les trajets quotidiens et repérez écoles, transports, commerces et structures de santé.",
   "Comparez plusieurs logements réellement disponibles avec la même surface et les mêmes critères.",
   "Visitez les quartiers à différents moments et échangez avec plusieurs habitants.",
   "Distinguez vos observations, les expériences personnelles et les informations confirmées par une source locale."
  ]
 },
 {
  "slug": "documents-et-demarches",
  "title": "Documents et démarches",
  "category": "Démarches",
  "summary": "Identifier les bons interlocuteurs et préparer un dossier adapté à sa situation.",
  "keywords": [
   "administratif",
   "documents",
   "consulat",
   "séjour",
   "douanes"
  ],
  "sourceIds": [],
  "steps": [
   "Identifiez les démarches qui dépendent de votre nationalité, de votre résidence et de votre situation familiale.",
   "Consultez la liste actuelle des pièces sur le site de l’autorité compétente avant de préparer le dossier.",
   "Vérifiez les règles concernant originaux, copies, traductions, rendez-vous et dates de validité.",
   "Pour votre déménagement, interrogez les douanes avant tout achat ou expédition.",
   "Conservez les références des demandes et les confirmations reçues."
  ]
 },
 {
  "slug": "logement",
  "title": "Préparer sa recherche de logement",
  "category": "Vie pratique",
  "summary": "Définir ses critères, préparer les visites et vérifier les conditions avant de s’engager.",
  "keywords": [
   "location",
   "achat",
   "immobilier",
   "maison",
   "appartement"
  ],
  "sourceIds": [
   "DZ-LEASE"
  ],
  "steps": [
   "Définissez le quartier, la surface, les déplacements et votre budget total.",
   "Préparez une liste de points à examiner : état du logement, eau, électricité, internet et environnement.",
   "Faites préciser par écrit le prix, les charges, la durée et les modalités de paiement.",
   "Vérifiez l’identité et la qualité du signataire avec un interlocuteur compétent avant tout engagement.",
   "Gardez une copie des documents et un état des lieux détaillé."
  ]
 },
 {
  "slug": "ecole-et-famille",
  "title": "École et vie de famille",
  "category": "Vie pratique",
  "summary": "Préparer la scolarité et les repères du quotidien pour les enfants.",
  "keywords": [
   "éducation",
   "enfants",
   "scolarité",
   "inscription",
   "étudiant"
  ],
  "sourceIds": [
   "DZ-EDUCATION",
   "AEFE-LIAD",
   "LIAD-LANGUAGES",
   "LIAD-ADMISSIONS"
  ],
  "steps": [
   "Identifiez les établissements adaptés à l’âge et au parcours scolaire de vos enfants.",
   "Demandez directement les conditions d’inscription, le calendrier et les pièces nécessaires.",
   "Renseignez-vous sur les langues, les programmes et l’accompagnement proposé.",
   "Évaluez les trajets, les horaires et l’organisation familiale.",
   "Prévoyez une période d’adaptation et gardez un lien avec l’équipe éducative."
  ]
 },
 {
  "slug": "sante",
  "title": "Préparer son accès aux soins",
  "category": "Vie pratique",
  "summary": "Organiser la continuité des soins et repérer les interlocuteurs utiles.",
  "keywords": [
   "médecin",
   "clinique",
   "assurance",
   "soins",
   "pharmacie"
  ],
  "sourceIds": [
   "DZ-CNAS",
   "DZ-CHIFA"
  ],
  "steps": [
   "Préparez avec vos soignants les éléments utiles à la continuité de votre suivi.",
   "Identifiez les structures et professionnels adaptés à vos besoins près du futur logement.",
   "Vérifiez votre couverture et les démarches auprès de l’organisme concerné.",
   "Si vous suivez un traitement, préparez sa continuité avec votre médecin et votre pharmacien.",
   "Conservez les coordonnées utiles et les documents médicaux dans un espace privé."
  ]
 },
 {
  "slug": "budget-et-banque",
  "title": "Budget et démarches bancaires",
  "category": "Vie pratique",
  "summary": "Préparer un budget réaliste et vérifier les conditions bancaires auprès du bon établissement.",
  "keywords": [
   "argent",
   "banque",
   "dinar",
   "euro",
   "compte",
   "paiement"
  ],
  "sourceIds": [],
  "steps": [
   "Séparez frais de départ, installation, dépenses mensuelles et imprévus.",
   "Basez les montants sur des devis et des prix datés correspondant à votre ville.",
   "Demandez aux établissements bancaires leurs conditions selon votre statut de résident.",
   "Faites confirmer les pièces, frais, devises et moyens de paiement proposés.",
   "Vérifiez les règles applicables aux transferts auprès de votre banque avant toute opération."
  ]
 },
 {
  "slug": "travail-et-entreprise",
  "title": "Travailler et entreprendre",
  "category": "Travail",
  "summary": "Préparer son activité et identifier les démarches auprès des organismes compétents.",
  "keywords": [
   "emploi",
   "entrepreneur",
   "investissement",
   "commerce",
   "registre",
   "fiscalité"
  ],
  "sourceIds": [
   "DZ-CNRC"
  ],
  "steps": [
   "Clarifiez votre projet : emploi salarié, activité indépendante ou création d’entreprise.",
   "Identifiez les qualifications, autorisations ou inscriptions à vérifier pour votre métier.",
   "Consultez les organismes officiels pour les démarches correspondant à votre statut.",
   "Préparez une étude de vos clients, charges et besoins de financement.",
   "Faites confirmer les obligations fiscales et sociales par un professionnel compétent."
  ]
 },
 {
  "slug": "transport",
  "title": "Se déplacer au quotidien",
  "category": "Vie pratique",
  "summary": "Repérer les trajets, les réseaux et les conditions de transport avant l’arrivée.",
  "keywords": [
   "train",
   "voiture",
   "taxi",
   "bus",
   "métro",
   "permis",
   "vol"
  ],
  "sourceIds": [],
  "steps": [
   "Repérez vos trajets les plus fréquents entre logement, travail et établissements scolaires.",
   "Consultez les horaires et tarifs directement auprès des opérateurs.",
   "Testez les trajets quand cela est possible, en tenant compte des heures d’affluence.",
   "Si vous conduisez, vérifiez les formalités concernant permis, véhicule et assurance.",
   "Prévoyez une solution de remplacement pour les déplacements essentiels."
  ]
 },
 {
  "slug": "internet-et-telecoms",
  "title": "Internet et télécommunications",
  "category": "Vie pratique",
  "summary": "Comparer les offres à partir de votre adresse et de vos usages.",
  "keywords": [
   "télécoms",
   "fibre",
   "mobile",
   "téléphone",
   "couverture",
   "internet"
  ],
  "sourceIds": [],
  "steps": [
   "Listez vos usages : travail à distance, appels, études et vidéo.",
   "Vérifiez l’éligibilité de votre adresse auprès de chaque opérateur.",
   "Comparez le coût total, les équipements, les conditions et les délais annoncés.",
   "Demandez quelles pièces fournir et comment suivre une demande d’ouverture.",
   "Avant de signer, confirmez les informations qui concernent précisément votre logement."
  ]
 },
 {
  "slug": "decouvrir-algerie",
  "title": "Découvrir les régions et la vie locale",
  "category": "Découverte",
  "summary": "Préparer ses découvertes, ses sorties et ses repères culturels.",
  "keywords": [
   "culture",
   "histoire",
   "tourisme",
   "sortie",
   "activité",
   "patrimoine"
  ],
  "sourceIds": [],
  "steps": [
   "Choisissez une région et renseignez-vous sur ses lieux, ses saisons et ses possibilités de déplacement.",
   "Vérifiez les horaires, conditions d’accès et disponibilités auprès des lieux concernés.",
   "Croisez les témoignages avec les informations des organisateurs et institutions locales.",
   "Respectez les consignes propres aux lieux visités et aux espaces naturels.",
   "Gardez vos découvertes et proposez une information au guide si elle peut être utile aux autres."
  ]
 },
 {
  "slug": "sorties-en-famille",
  "title": "Sorties, loisirs et découvertes",
  "category": "Sorties & découvertes",
  "summary": "Parcs, jardins, musées, plages et activités : préparer une sortie qui convient à chacun.",
  "keywords": [
   "demain",
   "parc",
   "jardin",
   "musée",
   "plage",
   "activité",
   "attraction",
   "sortie",
   "loisir",
   "enfant"
  ],
  "sourceIds": [],
  "steps": [
   "Choisissez une zone et le temps de trajet que vous souhaitez consacrer à la sortie.",
   "Précisez les âges, les envies, le budget et les besoins d’accessibilité de votre groupe.",
   "Vérifiez directement les horaires pour la date choisie, les conditions d’accès et la réservation éventuelle.",
   "Pour une activité en extérieur, consultez les conditions locales et les consignes du gestionnaire.",
   "Gardez une autre idée à proximité en cas de fermeture ou de changement de programme."
  ]
 },
 {
  "slug": "restaurants",
  "title": "Restaurants, cafés et bonnes tables",
  "category": "Manger & séjourner",
  "summary": "Choisir une adresse selon le quartier, ses envies et les besoins de son groupe.",
  "keywords": [
   "restaurant",
   "café",
   "manger",
   "cuisine",
   "repas",
   "brunch",
   "famille"
  ],
  "sourceIds": [],
  "steps": [
   "Définissez le quartier, le nombre de personnes, l’horaire et votre budget.",
   "Consultez un menu récent et confirmez directement les prix, l’ouverture et la réservation.",
   "Demandez les informations utiles : accueil des enfants, accès, terrasse ou possibilités pour votre groupe.",
   "Si vous avez une allergie ou une contrainte alimentaire, faites confirmer les ingrédients et les précautions par l’établissement.",
   "Lisez plusieurs retours récents en distinguant expériences personnelles et informations confirmées."
  ]
 },
 {
  "slug": "pharmacies",
  "title": "Trouver une pharmacie",
  "category": "Santé & bien-être",
  "summary": "Rechercher un point de service dans sa commune et confirmer les horaires utiles.",
  "keywords": [
   "pharmacie",
   "garde",
   "médicament",
   "santé"
  ],
  "sourceIds": [],
  "steps": [
   "Précisez la commune et l’heure à laquelle vous souhaitez vous rendre à la pharmacie.",
   "Vérifiez les coordonnées et les horaires directement ; une pharmacie de garde doit être confirmée pour le jour concerné.",
   "Appelez avant le déplacement pour une demande précise de disponibilité.",
   "Pour une question sur un traitement ou sa substitution, adressez-vous à votre pharmacien ou à votre médecin."
  ]
 },
 {
  "slug": "services-du-quotidien",
  "title": "Trouver le bon service au quotidien",
  "category": "Services",
  "summary": "Artisans, automobile, aide à domicile, sport et bien-être : préciser son besoin et comparer.",
  "keywords": [
   "artisan",
   "plombier",
   "service",
   "travaux",
   "massage",
   "masseur",
   "bien-être",
   "sport",
   "réparation",
   "automobile"
  ],
  "sourceIds": [],
  "steps": [
   "Décrivez la prestation attendue, votre localisation et le délai souhaité.",
   "Vérifiez l’identité du prestataire et, si l’activité le nécessite, ses qualifications et autorisations.",
   "Demandez le périmètre de la prestation, son prix, les frais additionnels et les conditions d’annulation.",
   "Comparez des offres portant sur le même besoin et posez vos questions avant de confirmer.",
   "Après la prestation, partagez une expérience précise et factuelle, sans publier de données personnelles."
  ]
 },
 {
  "slug": "vie-musulmane",
  "title": "Mosquées, enseignement coranique et librairies",
  "category": "Vie musulmane",
  "summary": "Trouver ses repères et identifier les informations à vérifier auprès de chaque lieu.",
  "keywords": [
   "mosquée",
   "coran",
   "librairie",
   "musulman",
   "religion",
   "prière"
  ],
  "sourceIds": [
   "DZ-MARW",
   "DZ-MOSQUES",
   "DZ-DJAMAA",
   "DZ-FATWA"
  ],
  "steps": [
   "Précisez le lieu recherché, votre commune et le besoin : pratique, apprentissage ou achat de livres.",
   "Confirmez auprès du lieu son adresse, ses horaires et les publics accueillis.",
   "Pour un enseignement, demandez le programme, les intervenants, les conditions d’inscription et le statut de la structure.",
   "Pour une librairie, vérifiez le catalogue, les éditions et la disponibilité des ouvrages directement.",
   "Les questions religieuses personnelles se posent à un interlocuteur compétent ; les informations de ce guide ne sont pas des avis religieux."
  ]
 },
 {
  "slug": "hajj-et-omra",
  "title": "Préparer un projet de Hajj ou d’Omra",
  "category": "Vie musulmane",
  "summary": "Identifier les organismes compétents et vérifier une offre pour la bonne saison.",
  "keywords": [
   "hajj",
   "hadj",
   "omra",
   "umra",
   "mecque",
   "voyage",
   "pèlerinage"
  ],
  "sourceIds": [
   "DZ-ONPO-HAJJ",
   "DZ-ONPO-OMRA",
   "DZ-ONPO-GUIDES",
   "SA-NUSUK",
   "DZ-TOURISM"
  ],
  "steps": [
   "Définissez le voyage souhaité, la saison, les participants et leurs besoins.",
   "Vérifiez séparément l’identité de l’agence, sa licence touristique et l’autorisation ONPO pour l’activité et la saison exactes.",
   "Demandez une offre détaillée : transport, hébergement, distances, accompagnement, formalités et prestations exclues.",
   "Faites préciser les conditions d’annulation et de remboursement avant tout paiement.",
   "Consultez les informations des autorités algériennes et saoudiennes pour votre situation. Les listes d’agences doivent être contrôlées individuellement ; aucun pack DALIL n’est actuellement vendu."
  ]
 }
]
export const WILAYAS: { code: number; name: string; transition?: boolean }[] = [{"code":1,"name":"Adrar"},{"code":2,"name":"Chlef"},{"code":3,"name":"Laghouat"},{"code":4,"name":"Oum El Bouaghi"},{"code":5,"name":"Batna"},{"code":6,"name":"Béjaïa"},{"code":7,"name":"Biskra"},{"code":8,"name":"Béchar"},{"code":9,"name":"Blida"},{"code":10,"name":"Bouira"},{"code":11,"name":"Tamanrasset"},{"code":12,"name":"Tébessa"},{"code":13,"name":"Tlemcen"},{"code":14,"name":"Tiaret"},{"code":15,"name":"Tizi Ouzou"},{"code":16,"name":"Alger"},{"code":17,"name":"Djelfa"},{"code":18,"name":"Jijel"},{"code":19,"name":"Sétif"},{"code":20,"name":"Saïda"},{"code":21,"name":"Skikda"},{"code":22,"name":"Sidi Bel Abbès"},{"code":23,"name":"Annaba"},{"code":24,"name":"Guelma"},{"code":25,"name":"Constantine"},{"code":26,"name":"Médéa"},{"code":27,"name":"Mostaganem"},{"code":28,"name":"M’Sila"},{"code":29,"name":"Mascara"},{"code":30,"name":"Ouargla"},{"code":31,"name":"Oran"},{"code":32,"name":"El Bayadh"},{"code":33,"name":"Illizi"},{"code":34,"name":"Bordj Bou Arréridj"},{"code":35,"name":"Boumerdès"},{"code":36,"name":"El Tarf"},{"code":37,"name":"Tindouf"},{"code":38,"name":"Tissemsilt"},{"code":39,"name":"El Oued"},{"code":40,"name":"Khenchela"},{"code":41,"name":"Souk Ahras"},{"code":42,"name":"Tipaza"},{"code":43,"name":"Mila"},{"code":44,"name":"Aïn Defla"},{"code":45,"name":"Naâma"},{"code":46,"name":"Aïn Témouchent"},{"code":47,"name":"Ghardaïa"},{"code":48,"name":"Relizane"},{"code":49,"name":"Timimoun"},{"code":50,"name":"Bordj Badji Mokhtar"},{"code":51,"name":"Ouled Djellal"},{"code":52,"name":"Béni Abbès"},{"code":53,"name":"In Salah"},{"code":54,"name":"In Guezzam"},{"code":55,"name":"Touggourt"},{"code":56,"name":"Djanet"},{"code":57,"name":"El M’Ghair"},{"code":58,"name":"El Meniaa"},{"code":59,"name":"Aflou","transition":true},{"code":60,"name":"Barika","transition":true},{"code":61,"name":"Ksar Chellala","transition":true},{"code":62,"name":"Messaad","transition":true},{"code":63,"name":"Aïn Oussera","transition":true},{"code":64,"name":"Bou Saâda","transition":true},{"code":65,"name":"El Abiodh Sidi Cheikh","transition":true},{"code":66,"name":"El Kantara","transition":true},{"code":67,"name":"Bir El Ater","transition":true},{"code":68,"name":"Ksar El Boukhari","transition":true},{"code":69,"name":"El Aricha","transition":true}]
