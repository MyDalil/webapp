/**
 * Thèmes des démarches officielles (un dossier mémoire chacun : src/rubriques/demarches/<clé>/).
 * Ordre d’affichage de la page Démarches. Modèle de format : service-public.gouv.fr.
 */
export type ThemeKey =
  | 'identite' | 'etat-civil' | 'nationalite-justice' | 'voyage-circulation' | 'consulaire-diaspora'
  | 'entreprise' | 'fiscalite' | 'social-emploi' | 'logement-urbanisme' | 'vehicules-permis'
  | 'etrangers-en-algerie' | 'education-diplomes' | 'associations' | 'sante' | 'factures-services'

export type Theme = { key: ThemeKey; label: string; sub: string; lead: string; icon: string; color: 'vert' | 'sable' | 'ciel' | 'corail' | 'violet' }

export const THEMES: Theme[] = [
  { key: 'identite', label: 'Identité', sub: 'CNI, passeport', lead: 'Carte nationale d’identité et passeport biométriques : demande, renouvellement, suivi.', icon: 'passport', color: 'ciel' },
  { key: 'etat-civil', label: 'État civil', sub: 'Actes, 12S, apostille', lead: 'Actes de naissance, de mariage et de décès, livret de famille, apostille.', icon: 'file', color: 'vert' },
  { key: 'consulaire-diaspora', label: 'Algériens à l’étranger', sub: 'Consulat, procuration', lead: 'Immatriculation consulaire, procuration, service national, rapatriement, retraite.', icon: 'building', color: 'sable' },
  { key: 'nationalite-justice', label: 'Nationalité & justice', sub: 'Nationalité, casier', lead: 'Certificat de nationalité, casier judiciaire, suivi d’un dossier en justice.', icon: 'shield', color: 'violet' },
  { key: 'voyage-circulation', label: 'Voyage & douane', sub: 'Sortie, douane, CCR', lead: 'Circulation des personnes et des biens, formalités de douane, changement de résidence.', icon: 'truck', color: 'ciel' },
  { key: 'entreprise', label: 'Entreprise', sub: 'Registre, auto-entrepreneur', lead: 'Créer et gérer une activité : registre de commerce, auto-entrepreneur, startup, investissement.', icon: 'briefcase', color: 'sable' },
  { key: 'fiscalite', label: 'Impôts', sub: 'Déclaration, attestations', lead: 'Déclarer et payer en ligne, obtenir ses attestations fiscales.', icon: 'cash', color: 'corail' },
  { key: 'social-emploi', label: 'Sécurité sociale & emploi', sub: 'CNAS, retraite, ANEM', lead: 'Assurance sociale, carte Chifa, retraite, chômage, recherche d’emploi.', icon: 'users', color: 'vert' },
  { key: 'logement-urbanisme', label: 'Logement & urbanisme', sub: 'AADL, permis de construire', lead: 'Logement public, suivi de dossier, autorisations d’urbanisme.', icon: 'home', color: 'violet' },
  { key: 'vehicules-permis', label: 'Véhicules & permis', sub: 'Permis, carte grise', lead: 'Permis de conduire, immatriculation, vignette.', icon: 'car', color: 'ciel' },
  { key: 'education-diplomes', label: 'Éducation & diplômes', sub: 'Équivalence, examens', lead: 'Équivalence et légalisation des diplômes, inscriptions, examens nationaux.', icon: 'school', color: 'sable' },
  { key: 'etrangers-en-algerie', label: 'Étrangers en Algérie', sub: 'Séjour, résidence', lead: 'Visa, carte de résident et formalités de séjour.', icon: 'pin', color: 'vert' },
  { key: 'associations', label: 'Associations', sub: 'Créer, déclarer', lead: 'Créer, déclarer et faire vivre une association.', icon: 'heart', color: 'corail' },
  { key: 'sante', label: 'Santé', sub: 'Chifa, remboursements', lead: 'Démarches de santé et de remboursement.', icon: 'health', color: 'vert' },
  { key: 'factures-services', label: 'Factures & raccordements', sub: 'Électricité, eau, internet', lead: 'Payer ses factures et demander un raccordement en ligne.', icon: 'grid', color: 'violet' },
]

export const themeByKey = (k: string) => THEMES.find((t) => t.key === k) ?? null
export const THEME_KEYS = THEMES.map((t) => t.key) as [ThemeKey, ...ThemeKey[]]
