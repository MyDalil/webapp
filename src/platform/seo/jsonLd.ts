/**
 * Données structurées schema.org (JSON-LD) des fiches publiques.
 * Fonctions pures : elles reçoivent des valeurs déjà lues et n’émettent qu’un champ présent (règle 3 : rien d’inventé).
 * Jamais d’AggregateRating sans vrais avis publiés.
 */

export type Json = Record<string, unknown>
export type Crumb = { name: string; url: string }

const LANG_TAG = { fr: 'fr-DZ', en: 'en', ar: 'ar-DZ' } as const
export type SeoLang = keyof typeof LANG_TAG

/** Retire les champs vides (undefined, null, chaîne vide, tableau vide, objet sans contenu utile). */
export function clean<T extends Json>(o: T): Json {
  const out: Json = {}
  for (const [k, v] of Object.entries(o)) {
    if (v == null || v === '') continue
    if (Array.isArray(v)) {
      const a = v.filter((x) => x != null && x !== '').map((x) => (isObj(x) ? clean(x) : x)).filter((x) => !(isObj(x) && !meaningful(x)))
      if (a.length) out[k] = a
      continue
    }
    if (isObj(v)) {
      const c = clean(v)
      if (meaningful(c)) out[k] = c
      continue
    }
    out[k] = v
  }
  return out
}
const isObj = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x)
/** Un objet ne portant que @type (et addressCountry seul) n’apporte rien. */
const meaningful = (o: Json) => Object.keys(o).some((k) => k !== '@type' && k !== 'addressCountry')

const ctx = (o: Json): Json => ({ '@context': 'https://schema.org', ...clean(o) })

/** Type schema.org d’un lieu de l’annuaire, depuis sa catégorie du référentiel. LocalBusiness par défaut. */
const PLACE_TYPES: Record<string, string> = {
  Mosquées: 'Mosque',
  'Salles de prière': 'Mosque',
  Crèches: 'ChildCare',
  'Écoles primaires': 'ElementarySchool',
  Collèges: 'MiddleSchool',
  Lycées: 'HighSchool',
  Écoles: 'School',
  'Écoles coraniques': 'School',
  'Écoles de langues': 'School',
  'Formation professionnelle': 'School',
  'Instituts d’arabe et de sciences islamiques': 'School',
  'Auto-écoles': 'AutomotiveBusiness',
  Universités: 'CollegeOrUniversity',
  Hôpitaux: 'Hospital',
  Cliniques: 'MedicalClinic',
  Pharmacies: 'Pharmacy',
  Médecins: 'Physician',
  Dentistes: 'Dentist',
  Laboratoires: 'MedicalBusiness',
  Hijama: 'MedicalBusiness',
  Vétérinaires: 'VeterinaryCare',
  'Wilayas et daïras': 'GovernmentOffice',
  'Services municipaux': 'GovernmentOffice',
  'Sécurité sociale': 'GovernmentOffice',
  'Impôts et douanes': 'GovernmentOffice',
  Ministères: 'GovernmentOffice',
  Administrations: 'GovernmentOffice',
  'Offices du tourisme': 'GovernmentOffice',
  'Bureaux de poste': 'PostOffice',
  Tribunaux: 'Courthouse',
  Ambassades: 'Embassy',
  Consulats: 'Embassy',
  Musées: 'Museum',
  'Monuments et sites historiques': 'TouristAttraction',
  'Sites archéologiques': 'TouristAttraction',
  'Cascades, gorges et grottes': 'TouristAttraction',
  'Lacs et oasis': 'TouristAttraction',
  'Parcs naturels et réserves': 'Park',
  Parcs: 'Park',
  Jardins: 'Park',
  Plages: 'Beach',
  Bibliothèques: 'Library',
  Restaurants: 'Restaurant',
  'Restaurants familiaux': 'Restaurant',
  Cafés: 'CafeOrCoffeeShop',
  'Salons de thé': 'CafeOrCoffeeShop',
  Pâtisseries: 'Bakery',
  Glaciers: 'IceCreamShop',
  Hôtels: 'Hotel',
  'Maisons d’hôtes': 'BedAndBreakfast',
  'Agences de voyages': 'TravelAgency',
  Omra: 'TravelAgency',
  Hajj: 'TravelAgency',
  'Agences Omra & Hajj': 'TravelAgency',
  Spas: 'DaySpa',
  Hammams: 'DaySpa',
  'Soins esthétiques': 'BeautySalon',
  'Salles de sport': 'ExerciseGym',
  'Salles de sport pour femmes': 'ExerciseGym',
  'Clubs sportifs': 'SportsClub',
  'Installations sportives': 'SportsActivityLocation',
  'Piscines non mixtes': 'PublicSwimmingPool',
  'Agences immobilières': 'RealEstateAgent',
  Banques: 'BankOrCreditUnion',
  Avocats: 'Attorney',
  Notaires: 'Notary',
  Comptables: 'AccountingService',
  Librairies: 'BookStore',
  'Librairies islamiques': 'BookStore',
  Habillement: 'ClothingStore',
  'Mode modeste': 'ClothingStore',
  Alimentation: 'GroceryStore',
  'Stations-service': 'GasStation',
  'Location de véhicules': 'AutoRental',
  'Services automobiles': 'AutoRepair',
  'Lavage auto': 'AutoWash',
  'Pièces et accessoires auto': 'AutoPartsStore',
  'Gares et stations': 'TrainStation',
  'Pompes funèbres musulmanes et toilette mortuaire': 'FuneralHome',
}
export const placeType = (category: string | null | undefined) => (category && PLACE_TYPES[category]) || 'LocalBusiness'

/** Spécialités DALIL → énumération MedicalSpecialty de schema.org (absente = non émise). */
const SPECIALTIES: Record<string, string> = {
  'medecine-generale': 'PrimaryCare',
  pediatrie: 'Pediatric',
  gynecologie: 'Gynecologic',
  cardiologie: 'Cardiovascular',
  dermatologie: 'Dermatology',
  ophtalmologie: 'Optometric',
  orl: 'Otolaryngologic',
  psychiatrie: 'Psychiatric',
  endocrinologie: 'Endocrine',
  'gastro-enterologie': 'Gastroenterologic',
  rhumatologie: 'Rheumatologic',
  dentiste: 'Dentistry',
  orthodontie: 'Dentistry',
  'sage-femme': 'Midwifery',
  kinesitherapie: 'PhysicalTherapy',
  orthophonie: 'SpeechPathology',
  psychologie: 'Psychiatric',
  dietetique: 'DietNutrition',
}
export const medicalSpecialties = (values: (string | null | undefined)[] | null | undefined) =>
  [...new Set((values ?? []).map((v) => (v ? SPECIALTIES[v] : undefined)).filter(Boolean) as string[])].map((s) => `https://schema.org/${s}`)

export type Address = { street?: string | null; locality?: string | null; region?: string | null }
export const postalAddress = (a: Address): Json | undefined => {
  const o = clean({ '@type': 'PostalAddress', streetAddress: a.street, addressLocality: a.locality, addressRegion: a.region })
  return meaningful(o) ? { ...o, addressCountry: 'DZ' } : undefined
}
const geo = (pos?: [number, number] | null) => (pos ? { '@type': 'GeoCoordinates', latitude: pos[0], longitude: pos[1] } : undefined)
const tel = (v?: string | null) => (v ? v.replace(/[^\d+]/g, '') : undefined)
const httpUrl = (v?: string | null) => (v ? (/^https?:\/\//.test(v) ? v : `https://${v}`) : undefined)

export type PlaceInput = {
  name: string
  url: string
  lang: SeoLang
  category?: string | null
  description?: string | null
  address?: Address
  pos?: [number, number] | null
  /** Coordonnées publiées seulement (fiche avec showContacts). */
  phone?: string | null
  website?: string | null
  images?: (string | null | undefined)[]
  /** Horaires tels que saisis (« Lun–Ven · 9h–17h ») : texte libre, jamais converti en format machine inventé. */
  hours?: string[]
  alternateNames?: (string | null | undefined)[]
}
export function placeJsonLd(p: PlaceInput): Json {
  const type = placeType(p.category)
  return ctx({
    '@type': type,
    '@id': `${p.url}#lieu`,
    name: p.name,
    alternateName: p.alternateNames,
    description: p.description,
    url: p.url,
    image: p.images,
    address: p.address && postalAddress(p.address),
    geo: geo(p.pos),
    telephone: tel(p.phone),
    sameAs: httpUrl(p.website),
    openingHours: p.hours,
    inLanguage: LANG_TAG[p.lang],
  })
}

export type PractitionerInput = {
  name: string
  url: string
  lang: SeoLang
  specialties?: string[] | null
  jobTitle?: string | null
  description?: string | null
  address?: Address
  pos?: [number, number] | null
  phone?: string | null
  image?: string | null
  languages?: string[]
}
export function practitionerJsonLd(p: PractitionerInput): Json {
  return ctx({
    '@type': 'Physician',
    '@id': `${p.url}#praticien`,
    name: p.name,
    description: p.description,
    url: p.url,
    image: p.image,
    medicalSpecialty: medicalSpecialties(p.specialties),
    address: p.address && postalAddress(p.address),
    geo: geo(p.pos),
    telephone: tel(p.phone),
    knowsLanguage: p.languages,
    inLanguage: LANG_TAG[p.lang],
  })
}

export type ProviderInput = {
  name: string
  url: string
  lang: SeoLang
  description?: string | null
  categories?: string[]
  region?: string | null
  areaServed?: string[]
  image?: string | null
  languages?: string[]
  /** Avis vérifiés publiés : agrégat émis seulement s’il y en a au moins un. */
  rating?: { value: number; count: number } | null
  offers?: { name: string; price?: number | null }[]
}
export function providerJsonLd(p: ProviderInput): Json {
  const rating = p.rating && p.rating.count > 0 && p.rating.value > 0 ? p.rating : null
  return ctx({
    '@type': 'ProfessionalService',
    '@id': `${p.url}#prestataire`,
    name: p.name,
    description: p.description,
    url: p.url,
    image: p.image,
    serviceType: p.categories,
    address: postalAddress({ region: p.region }),
    areaServed: p.areaServed,
    knowsLanguage: p.languages,
    aggregateRating: rating ? { '@type': 'AggregateRating', ratingValue: rating.value, reviewCount: rating.count, bestRating: 5, worstRating: 1 } : undefined,
    makesOffer: (p.offers ?? []).map((o) =>
      clean({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: o.name }, price: o.price ?? undefined, priceCurrency: o.price != null ? 'DZD' : undefined }),
    ),
    inLanguage: LANG_TAG[p.lang],
  })
}

export type ClassifiedInput = {
  title: string
  url: string
  lang: SeoLang
  category: string
  subLabel?: string | null
  description?: string | null
  images?: (string | null | undefined)[]
  place?: string | null
  publishedAt?: string | null
}
/** Immobilier → RealEstateListing ; objets et véhicules → Product ; emploi → Offer (pas de JobPosting sans employeur déclaré). */
export const classifiedType = (category: string) =>
  category === 'immobilier' ? 'RealEstateListing' : category === 'emploi' ? 'Offer' : 'Product'
export function classifiedJsonLd(c: ClassifiedInput): Json {
  const type = classifiedType(c.category)
  return ctx({
    '@type': type,
    '@id': `${c.url}#annonce`,
    name: c.title,
    description: c.description,
    url: c.url,
    image: c.images,
    category: c.subLabel,
    datePosted: type === 'RealEstateListing' ? c.publishedAt : undefined,
    availableAtOrFrom: type === 'Offer' && c.place ? { '@type': 'Place', address: postalAddress({ locality: c.place }) } : undefined,
    inLanguage: LANG_TAG[c.lang],
  })
}

export type ProcedureInput = {
  title: string
  url: string
  lang: SeoLang
  description?: string | null
  steps?: string[]
  officialUrl?: string | null
  image?: string | null
  dateModified?: string | null
}
/** Démarche : service public (GovernmentService) ; ses étapes, si elles existent, en HowTo. */
export function procedureJsonLd(p: ProcedureInput): Json[] {
  const service = ctx({
    '@type': 'GovernmentService',
    '@id': `${p.url}#demarche`,
    name: p.title,
    description: p.description,
    url: p.url,
    areaServed: { '@type': 'Country', name: 'Algérie', identifier: 'DZ' },
    sameAs: httpUrl(p.officialUrl),
    inLanguage: LANG_TAG[p.lang],
  })
  const steps = (p.steps ?? []).filter(Boolean)
  if (!steps.length) return [service]
  const howTo = ctx({
    '@type': 'HowTo',
    name: p.title,
    description: p.description,
    url: p.url,
    image: p.image,
    dateModified: p.dateModified,
    step: steps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })),
    inLanguage: LANG_TAG[p.lang],
  })
  return [service, howTo]
}

/** Fil d’Ariane : positions à partir de 1 ; une étape sans nom ou sans adresse est ignorée. */
export function breadcrumbJsonLd(items: Crumb[]): Json {
  const list = items.filter((c) => c.name && c.url)
  return ctx({
    '@type': 'BreadcrumbList',
    itemListElement: list.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
  })
}

/** Sérialisation sûre dans une balise <script> (aucune fermeture de balise possible). */
export const serializeJsonLd = (data: Json | Json[]) =>
  JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
