/**
 * Sujets de chaque thème : une démarche va dans le premier sujet dont le motif trouve son identifiant ou son titre.
 * Sinon : « Autres démarches ». Ajouter un sujet ici = un bloc de plus sur la page du thème.
 */
export type Topic = { key: string; title: string; sub: string; match: RegExp; photo?: string; tone?: string }

export const TOPICS: Record<string, Topic[]> = {
  identite: [
    { key: 'passeport', title: 'Passeport', sub: 'Demande, renouvellement, urgence.', match: /passeport/i, photo: 'passeport', tone: '#60a5fa' },
    { key: 'cni', title: 'Carte d’identité', sub: 'Carte nationale biométrique.', match: /identit|cni/i, photo: 'grande-poste', tone: '#38bdf8' },
    { key: 'perte', title: 'Perte ou vol', sub: 'Déclaration et remplacement.', match: /perte|vol/i, photo: 'protection-civile', tone: '#f87171' },
  ],
  'etat-civil': [
    { key: 'actes', title: 'Actes d’état civil', sub: 'Naissance, mariage, décès, livret, fiche familiale.', match: /acte-(naissance|mariage)|actes-etat|livret|fiche-familiale|extraits|12s/i, photo: 'grande-poste-jour', tone: '#4ade80' },
    { key: 'corriger', title: 'Corriger un acte', sub: 'Erreurs, mentions, concordance de nom.', match: /correct|rectif|mention|concordance/i, photo: 'grande-poste', tone: '#fbbf24' },
    { key: 'apostille', title: 'Apostille et légalisation', sub: 'Faire reconnaître un document à l’étranger.', match: /apostille|legalis|tasdik|copie-conforme/i, photo: 'ambassade', tone: '#a78bfa' },
    { key: 'deces', title: 'Décès et inhumation', sub: 'Déclaration, permis d’inhumer, transfert du corps.', match: /deces|inhumation|exhumation|transfert-corps/i, photo: 'cimetiere', tone: '#94a3b8' },
    { key: 'etranger', title: 'Actes faits à l’étranger', sub: 'Transcription au consulat.', match: /transcription|etabli-a-l-etranger/i, photo: 'ferry', tone: '#38bdf8' },
    { key: 'mariage', title: 'Mariage et situation', sub: 'Mariage mixte, certificats, résidence.', match: /mariage|celibat|non-mariage|residence/i, photo: 'casbah', tone: '#f472b6' },
  ],
  'consulaire-diaspora': [
    { key: 'immat', title: 'Inscription au consulat', sub: 'Immatriculation, radiation.', match: /immatriculation|radiation/i, photo: 'ambassade', tone: '#2dd4bf' },
    { key: 'retour', title: 'Retour en Algérie', sub: 'Changement de résidence, franchise douanière.', match: /ccr|changement-residence|retour/i, photo: 'port-alger', tone: '#fbbf24' },
  ],
  entreprise: [
    { key: 'registre', title: 'Registre de commerce', sub: 'Inscription, modification, radiation.', match: /registre/i, photo: 'epices', tone: '#f472b6' },
    { key: 'auto', title: 'Auto-entrepreneur', sub: 'Carte, micro-importation.', match: /auto-entrepreneur|micro/i, photo: 'marche', tone: '#fb923c' },
    { key: 'startup', title: 'Startups et investissement', sub: 'Labels, AAPI.', match: /label|startup|incubateur|investissement|aapi/i, photo: 'universite', tone: '#818cf8' },
    { key: 'autorisations', title: 'Activités réglementées', sub: 'Autorisations de la wilaya.', match: /.*/, photo: 'grande-poste-jour', tone: '#a3e635' },
  ],
  'social-emploi': [
    { key: 'employeur', title: 'Employeurs', sub: 'Affiliation et cotisations CNAS.', match: /employeur|cotisation|mise-a-jour/i, photo: 'alger-ville', tone: '#34d399' },
    { key: 'assure', title: 'Assurés', sub: 'Attestations, espace assuré, étudiants.', match: /.*/, photo: 'hopital-moderne', tone: '#60a5fa' },
  ],
  'logement-urbanisme': [
    { key: 'aides', title: 'Logement aidé', sub: 'LPA, LPL, logement rural.', match: /lpa|lpl|public-locatif|rural/i, photo: 'oran-panorama', tone: '#c084fc' },
    { key: 'urba', title: 'Urbanisme', sub: 'Agréments et autorisations.', match: /.*/, photo: 'alger-ville', tone: '#fbbf24' },
  ],
  'etrangers-en-algerie': [
    { key: 'visa', title: 'Visa et séjour', sub: 'Entrée, prolongation, régularisation.', match: /visa|prolongation/i, photo: 'port-alger', tone: '#22d3ee' },
    { key: 'resident', title: 'Résidence et travail', sub: 'Carte de résident, carte de commerçant.', match: /carte/i, photo: 'alger-mer', tone: '#a78bfa' },
  ],
}
export const topicsOf = (theme: string) => TOPICS[theme] ?? []
