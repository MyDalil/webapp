/**
 * Sites officiels des démarches en ligne en Algérie (équivalent des sites publics gratuits français).
 * Règle : seulement des adresses publiques relevées dans une source citée, avec la date du relevé — aucune adresse devinée.
 * À migrer vers une collection Payload sourcée (voir AGENTS.md du module).
 */
export type OfficialSite = { need: string; what: string; site: string; url: string; source: string }

export const OFFICIAL_SITES_CHECKED = '2026-10-27'

export const OFFICIAL_SITES: OfficialSite[] = [
  { need: 'Toutes les démarches en ligne', what: 'Portail unique de l’État : état civil, justice, sécurité sociale, impôts, factures, Hadj…', site: 'Dzair Digital Services', url: 'https://dzds.dz/', source: 'Algérie360, 18 octobre 2026' },
  { need: 'Acte de naissance, mariage, décès', what: 'Demande en ligne des actes d’état civil (ministère de l’Intérieur).', site: 'dzds.dz', url: 'https://dzds.dz/', source: 'Algérie360, 18 octobre 2026' },
  { need: 'Acte de naissance 12S (consulat)', what: 'Pour les Algériens nés en Algérie et immatriculés dans un consulat.', site: 'Ministère de l’Intérieur', url: 'https://demande12s.interieur.gov.dz/', source: 'Algérie360, 18 octobre 2026' },
  { need: 'Passeport, carte d’identité, permis', what: 'Demande de carte d’identité biométrique et suivi des dossiers.', site: 'Ministère de l’Intérieur', url: 'https://passeport.interieur.gov.dz/', source: 'Algérie360, 13 octobre 2026' },
  { need: 'Autres services de l’Intérieur', what: 'Portail des services en ligne du ministère.', site: 'Ministère de l’Intérieur', url: 'https://services.interieur.gov.dz/fr/', source: 'Algérie360, 13 octobre 2026' },
  { need: 'Casier judiciaire, nationalité', what: 'Bulletin n° 3 du casier judiciaire et certificat de nationalité.', site: 'Ministère de la Justice', url: 'https://portail.mjustice.dz', source: 'Algérie360, 18 octobre 2026' },
  { need: 'Suivre un dossier en justice', what: 'Consultation et suivi d’un dossier judiciaire.', site: 'Ministère de la Justice', url: 'https://www.mjustice.gov.dz/fr/consultation-et-suivi-de-votre-dossier-judiciaire-2/', source: 'Algérie360, 18 octobre 2026' },
  { need: 'Déclarer et payer ses impôts', what: 'Télédéclaration et paiement en ligne (Direction générale des impôts).', site: 'Jibaya’tic', url: 'https://jibayatic.mf.gov.dz', source: 'TSA, 26 avril 2026' },
  { need: 'Attestations fiscales', what: 'Extrait de rôle, certificat de non-imposition, certificat C20, attestation NIF.', site: 'dzds.dz', url: 'https://dzds.dz/', source: 'Algérie360, 18 octobre 2026' },
  { need: 'Sécurité sociale et chômage', what: 'Attestations d’affiliation CNAS ou Casnos, attestation de revenu, allocation chômage.', site: 'dzds.dz', url: 'https://dzds.dz/', source: 'Algérie360, 18 octobre 2026' },
  { need: 'Électricité, gaz et eau', what: 'Paiement des factures Sonelgaz, demande de raccordement à l’eau potable.', site: 'dzds.dz', url: 'https://dzds.dz/', source: 'Algérie360, 18 octobre 2026' },
  { need: 'Diplômes étrangers, apostille', what: 'Reconnaissance des diplômes étrangers, apostille électronique (Affaires étrangères).', site: 'dzds.dz', url: 'https://dzds.dz/', source: 'Algérie360, 18 octobre 2026' },
]
