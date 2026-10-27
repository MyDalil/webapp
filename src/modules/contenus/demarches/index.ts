import { AUTO_ENTREPRENEUR } from './autoEntrepreneur'
import { CCR } from './ccr'
import { PASSEPORT } from './passeport'
import type { Demarche, DemarcheCategory } from './types'

export type { Demarche, DemarcheCategory, Fact as GuideFact, KeyPoint, Source as GuideSource, Tone } from './types'

/** Démarches phares (fiches sourcées), dans l’ordre d’affichage. */
export const DEMARCHES: Demarche[] = [PASSEPORT, AUTO_ENTREPRENEUR, CCR]

export const demarcheBySlug = (slug: string) => DEMARCHES.find((d) => d.slug === slug) ?? null

/** Catégories populaires : chacune mène à sa fiche ou à son guide. */
export const DEMARCHE_CATEGORIES: DemarcheCategory[] = [
  { key: 'citoyennete', label: 'Citoyenneté', sub: 'Passeport, CNI', icon: 'passport', href: '/demarches/passeport', color: 'ciel' },
  { key: 'entreprise', label: 'Entreprise', sub: 'Auto-entrepreneur', icon: 'briefcase', href: '/demarches/auto-entrepreneur', color: 'sable' },
  { key: 'diaspora', label: 'Retour au pays', sub: 'CCR, douane', icon: 'truck', href: '/demarches/ccr', color: 'vert' },
  { key: 'logement', label: 'Logement', sub: 'AADL, LPP', icon: 'home', href: '/guides/logement', color: 'violet' },
  { key: 'finances', label: 'Finances', sub: 'Banque, impôts', icon: 'cash', href: '/guides/budget-et-banque', color: 'corail' },
]
