/**
 * Catalogue des services entre particuliers et prestataires (validé par Rad le 2026-10-16).
 * `sensitive` : missions auprès d’enfants, de personnes âgées ou de mineurs → casier judiciaire vérifié avant publication.
 */
export const CATEGORIES = [
  {
    value: 'bricolage',
    label: 'Bricolage',
    activities: [
      ['montage-meubles', 'Montage de meubles'],
      ['petits-travaux', 'Petits travaux'],
      ['plomberie', 'Plomberie'],
      ['electricite', 'Électricité'],
      ['peinture', 'Peinture'],
      ['fixations', 'Fixations (rideaux, étagères, TV)'],
      ['climatisation', 'Climatisation (pose et entretien)'],
      ['serrurerie', 'Serrurerie'],
      ['carrelage', 'Carrelage'],
    ],
  },
  {
    value: 'menage',
    label: 'Ménage',
    activities: [
      ['menage-regulier', 'Ménage régulier'],
      ['grand-menage', 'Grand ménage'],
      ['fin-de-chantier', 'Ménage de fin de chantier'],
      ['repassage', 'Repassage'],
      ['vitres', 'Nettoyage des vitres'],
      ['tapis-canapes', 'Lavage de tapis et canapés'],
      ['nettoyage-voiture', 'Nettoyage de voiture'],
    ],
  },
  {
    value: 'demenagement',
    label: 'Déménagement',
    activities: [
      ['aide-demenagement', 'Aide au déménagement'],
      ['transport-fourgon', 'Transport en fourgon'],
      ['debarras', 'Débarras et encombrants'],
    ],
  },
  {
    value: 'jardinage',
    label: 'Jardinage',
    activities: [
      ['tonte', 'Tonte de pelouse'],
      ['taille', 'Taille de haies et d’arbres'],
      ['entretien-jardin', 'Entretien de jardin'],
      ['arrosage', 'Arrosage'],
      ['piscine', 'Entretien de piscine'],
    ],
  },
  {
    value: 'garde-enfants',
    label: 'Garde d’enfants',
    sensitive: true,
    activities: [
      ['baby-sitting', 'Baby-sitting'],
      ['sortie-ecole', 'Sortie d’école'],
      ['aide-devoirs', 'Aide aux devoirs'],
    ],
  },
  {
    value: 'garde-animaux',
    label: 'Garde d’animaux',
    activities: [
      ['garde-animal-domicile', 'Garde à domicile'],
      ['promenade', 'Promenade'],
      ['visites-nourrissage', 'Visites et nourrissage'],
    ],
  },
  {
    value: 'informatique',
    label: 'Informatique',
    activities: [
      ['depannage-pc', 'Dépannage PC'],
      ['internet-wifi', 'Internet et wifi'],
      ['smartphone', 'Smartphone et tablette'],
      ['cameras', 'Caméras de surveillance'],
      ['initiation-informatique', 'Initiation à l’informatique'],
    ],
  },
  {
    value: 'aide-domicile',
    label: 'Aide à domicile',
    sensitive: true,
    activities: [
      ['compagnie-seniors', 'Compagnie des personnes âgées'],
      ['courses', 'Courses'],
      ['repas', 'Préparation des repas'],
      ['accompagnement-rdv', 'Accompagnement aux rendez-vous'],
      ['auxiliaire-vie', 'Auxiliaire de vie'],
    ],
  },
  {
    value: 'cours-particuliers',
    label: 'Cours particuliers',
    sensitive: true,
    activities: [
      ['soutien-primaire', 'Soutien scolaire — primaire'],
      ['soutien-cem', 'Soutien scolaire — CEM'],
      ['soutien-lycee', 'Soutien scolaire — lycée'],
      ['prepa-bem-bac', 'Préparation BEM et BAC'],
      ['cours-langues', 'Langues (arabe, tamazight, français, anglais)'],
      ['musique', 'Musique'],
    ],
  },
  {
    value: 'cours-coraniques',
    label: 'Cours coraniques',
    sensitive: true,
    activities: [
      ['lecture-coran', 'Lecture du Coran'],
      ['tajwid', 'Tajwid'],
      ['hifz', 'Mémorisation (hifz)'],
      ['arabe-coranique', 'Arabe coranique'],
    ],
  },
  {
    value: 'coach-sportif',
    label: 'Coach sportif',
    activities: [
      ['remise-en-forme', 'Remise en forme'],
      ['musculation', 'Musculation'],
      ['yoga-pilates', 'Yoga et pilates'],
      ['arts-martiaux', 'Arts martiaux et self-défense'],
      ['sport-exterieur', 'Sport en extérieur'],
    ],
  },
] as const satisfies readonly { value: string; label: string; sensitive?: boolean; activities: readonly (readonly [string, string])[] }[]

export type CategoryValue = (typeof CATEGORIES)[number]['value']

export type ActivityInfo = { value: string; label: string; category: string; sensitive: boolean }
export const ACTIVITIES: ActivityInfo[] = CATEGORIES.flatMap((c) => c.activities.map(([value, label]) => ({ value: value as string, label: label as string, category: c.value as string, sensitive: Boolean((c as { sensitive?: boolean }).sensitive) })))
const BY_ACTIVITY = new Map<string, ActivityInfo>(ACTIVITIES.map((a) => [a.value, a]))

export const activity = (v: string | null | undefined) => (v ? BY_ACTIVITY.get(v) ?? null : null)
export const activityLabel = (v: string) => BY_ACTIVITY.get(v)?.label ?? v
export const category = (v: string | null | undefined) => CATEGORIES.find((c) => c.value === v) ?? null
export const categoryLabel = (v: string) => category(v)?.label ?? v
export const isSensitive = (activities: string[]) => activities.some((a) => BY_ACTIVITY.get(a)?.sensitive)

/** Clientèle acceptée (option du prestataire). */
export const CLIENTELE = [
  { value: 'all', label: 'Tout le monde' },
  { value: 'women', label: 'Réservé aux clientes' },
  { value: 'men', label: 'Réservé aux clients' },
] as const

export const GENDERS = [
  { value: 'femme', label: 'Femme' },
  { value: 'homme', label: 'Homme' },
] as const

export const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'] as const

export const priceLabel = (o: { pricing?: string | null; price?: number | null; unit?: string | null }) =>
  o.price ? `${new Intl.NumberFormat('fr-FR').format(o.price)} DA${o.pricing === 'flat' ? (o.unit ? ` ${o.unit}` : ' le forfait') : '/h'}` : 'Prix à convenir'
