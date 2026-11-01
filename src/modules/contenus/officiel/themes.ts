/**
 * Thèmes des démarches officielles (un dossier mémoire chacun : src/rubriques/demarches/<clé>/).
 * Ordre d’affichage de la page Démarches. Modèle de format : service-public.gouv.fr.
 */
export type ThemeKey =
  | 'identite' | 'etat-civil' | 'nationalite-justice' | 'voyage-circulation' | 'consulaire-diaspora'
  | 'entreprise' | 'fiscalite' | 'social-emploi' | 'logement-urbanisme' | 'vehicules-permis'
  | 'etrangers-en-algerie' | 'education-diplomes' | 'associations' | 'sante' | 'factures-services'

export type Theme = { key: ThemeKey; label: string; sub: string; lead: string; icon: string; color: 'vert' | 'sable' | 'ciel' | 'corail' | 'violet'; tone: string; d: string; row: 1 | 2 }

export const THEMES: Theme[] = [
  { key: 'identite', label: 'Identité', sub: 'CNI, passeport', lead: 'Carte nationale d’identité et passeport biométriques : demande, renouvellement, suivi.', icon: 'passport', color: 'ciel', tone: '#60a5fa', d: 'M4 4h16v16H4zM9 10a3 3 0 1 0 6 0 3 3 0 0 0-6 0M7 18c1-2 3-3 5-3s4 1 5 3', row: 1 },
  { key: 'etat-civil', label: 'État civil', sub: 'Actes, 12S, apostille', lead: 'Actes de naissance, de mariage et de décès, livret de famille, apostille.', icon: 'file', color: 'vert', tone: '#4ade80', d: 'M14 3H6v18h12V7l-4-4ZM14 3v4h4M9 13h6M9 17h6', row: 1 },
  { key: 'consulaire-diaspora', label: 'Algériens à l’étranger', sub: 'Consulat, procuration', lead: 'Immatriculation consulaire, procuration, service national, rapatriement, retraite.', icon: 'building', color: 'sable', tone: '#fbbf24', d: 'M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', row: 1 },
  { key: 'nationalite-justice', label: 'Nationalité & justice', sub: 'Nationalité, casier', lead: 'Certificat de nationalité, casier judiciaire, suivi d’un dossier en justice.', icon: 'shield', color: 'violet', tone: '#a78bfa', d: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z', row: 1 },
  { key: 'voyage-circulation', label: 'Voyage & douane', sub: 'Sortie, douane, CCR', lead: 'Circulation des personnes et des biens, formalités de douane, changement de résidence.', icon: 'truck', color: 'ciel', tone: '#38bdf8', d: 'M2 16h20M5 16l2-7h10l2 7M4 20h16M9 9V5h6v4', row: 1 },
  { key: 'entreprise', label: 'Entreprise', sub: 'Registre, auto-entrepreneur', lead: 'Créer et gérer une activité : registre de commerce, auto-entrepreneur, startup, investissement.', icon: 'briefcase', color: 'sable', tone: '#f472b6', d: 'M2 7h20v14H2zM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16', row: 2 },
  { key: 'fiscalite', label: 'Impôts', sub: 'Déclaration, attestations', lead: 'Déclarer et payer en ligne, obtenir ses attestations fiscales.', icon: 'cash', color: 'corail', tone: '#facc15', d: 'M4 3h16v18l-3-2-3 2-3-2-3 2-4-2zM8 8h8M8 12h8M8 16h5', row: 2 },
  { key: 'social-emploi', label: 'Sécurité sociale & emploi', sub: 'CNAS, retraite, ANEM', lead: 'Assurance sociale, carte Chifa, retraite, chômage, recherche d’emploi.', icon: 'users', color: 'vert', tone: '#34d399', d: 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M21 21v-2a4 4 0 0 0-3-3.9', row: 2 },
  { key: 'logement-urbanisme', label: 'Logement & urbanisme', sub: 'AADL, permis de construire', lead: 'Logement public, suivi de dossier, autorisations d’urbanisme.', icon: 'home', color: 'violet', tone: '#c084fc', d: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z', row: 2 },
  { key: 'vehicules-permis', label: 'Véhicules & permis', sub: 'Permis, carte grise', lead: 'Permis de conduire, immatriculation, vignette.', icon: 'car', color: 'ciel', tone: '#fb923c', d: 'M5 17h14M6 17l1.5-6h9L18 17M7 17v2M17 17v2M8 14h.01M16 14h.01', row: 1 },
  { key: 'education-diplomes', label: 'Éducation & diplômes', sub: 'Équivalence, examens', lead: 'Équivalence et légalisation des diplômes, inscriptions, examens nationaux.', icon: 'school', color: 'sable', tone: '#818cf8', d: 'M22 10 12 5 2 10l10 5 10-5ZM6 12v5c3 3 9 3 12 0v-5', row: 2 },
  { key: 'etrangers-en-algerie', label: 'Étrangers en Algérie', sub: 'Séjour, résidence', lead: 'Visa, carte de résident et formalités de séjour.', icon: 'pin', color: 'vert', tone: '#22d3ee', d: 'M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5', row: 2 },
  { key: 'associations', label: 'Associations', sub: 'Créer, déclarer', lead: 'Créer, déclarer et faire vivre une association.', icon: 'heart', color: 'corail', tone: '#f9a8d4', d: 'M7 11v8M4 19h16M12 4v15M17 8v11', row: 2 },
  { key: 'sante', label: 'Santé', sub: 'Chifa, remboursements', lead: 'Démarches de santé et de remboursement.', icon: 'health', color: 'vert', tone: '#f87171', d: 'M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z', row: 2 },
  { key: 'factures-services', label: 'Factures & raccordements', sub: 'Électricité, eau, internet', lead: 'Payer ses factures et demander un raccordement en ligne.', icon: 'grid', color: 'violet', tone: '#a3e635', d: 'M13 2 3 14h9l-1 8 10-12h-9z', row: 2 },
]

export const themeByKey = (k: string) => THEMES.find((t) => t.key === k) ?? null
export const THEME_KEYS = THEMES.map((t) => t.key) as [ThemeKey, ...ThemeKey[]]
