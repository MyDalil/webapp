import { PHOTOS, type PhotoKey } from '@/platform/referentiel/photos'

/** Photo d’illustration de chaque thème (photos libres déjà créditées sur /credits-photos). */
const THEME_PHOTO: Record<string, PhotoKey> = {
  identite: 'passeport',
  'etat-civil': 'grande-poste',
  'consulaire-diaspora': 'ambassade',
  'nationalite-justice': 'grande-poste-jour',
  'voyage-circulation': 'port-alger',
  entreprise: 'epices',
  fiscalite: 'banque-algerie',
  'social-emploi': 'alger-ville',
  'logement-urbanisme': 'oran-panorama',
  'vehicules-permis': 'tramway',
  'education-diplomes': 'universite',
  'etrangers-en-algerie': 'alger-mer',
  associations: 'marche',
  sante: 'pharmacie',
  'factures-services': 'telecom',
}
export const themePhoto = (theme?: string | null) => PHOTOS[THEME_PHOTO[theme ?? ''] ?? 'grande-poste']
