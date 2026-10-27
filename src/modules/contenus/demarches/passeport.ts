import type { Demarche } from './types'

/** Passeport biométrique : tarifs (LF 2026), dossier au consulat, renouvellement en ligne, suivi. Sources relevées le 27/10/2026. */
export const PASSEPORT: Demarche = {
  slug: 'passeport',
  title: 'Passeport biométrique',
  short: 'Passeport biométrique',
  category: 'citoyennete',
  icon: 'passport',
  tone: 'ciel',
  image: '/images/demarches/passeport.svg',
  summary: 'Tarifs, pièces à fournir au consulat, renouvellement en ligne et suivi du dossier.',
  lead: 'Obtenir ou renouveler votre passeport, en Algérie ou au consulat.',
  where: 'Algérie ou consulat',
  checked: '2026-10-27',
  keyPoints: [
    { icon: 'cash', label: 'Timbre en Algérie', value: '6 000 DA (28 pages)', src: ['tsa-tarifs'] },
    { icon: 'clock', label: 'Procédure accélérée', value: '25 000 DA', src: ['tsa-tarifs'] },
    { icon: 'file', label: 'Renouvellement', value: '6 mois avant la fin', src: ['tsa-consulat'] },
    { icon: 'check', label: 'Suivi', value: 'En ligne', src: ['interieur'] },
  ],
  outline: ['Choisir le bon tarif', 'Réunir les pièces', 'Prendre rendez-vous', 'Suivre votre dossier'],
  sections: [
    {
      title: 'Les tarifs (loi de finances 2026)',
      facts: [
        { text: 'Passeport de 28 pages : 6 000 DA. Passeport de 48 pages : 9 000 DA.', src: ['tsa-tarifs'] },
        { text: 'Procédure accélérée : 25 000 DA (28 pages) ou 45 000 DA (48 pages).', src: ['tsa-tarifs'] },
        { text: 'Mineurs et étudiants : 3 000 DA (28 pages) ou 4 500 DA (48 pages).', src: ['tsa-tarifs'] },
        { text: 'Perte ou détérioration : 10 000 DA en plus.', src: ['tsa-tarifs'] },
        { text: 'Au consulat, le prix est fixé chaque année en devises. Un amendement annonce 40 € au lieu de 60 € : à confirmer auprès de votre consulat.', src: ['tsa-tarifs', 'algerie-eco'] },
      ],
    },
    {
      title: 'Les pièces au consulat',
      facts: [
        { text: 'Carte d’immatriculation consulaire, acte de naissance 12S, ancien passeport, formulaire rempli et signé.', src: ['tsa-consulat'] },
        { text: 'Titre de séjour (ou pièce d’identité du pays de résidence), justificatif de domicile de moins de 3 mois, justificatif de profession ou de scolarité, 2 photos.', src: ['tsa-consulat'] },
        { text: 'Femme mariée : acte de mariage ou livret de famille. Femme divorcée : jugement de divorce.', src: ['tsa-consulat'] },
      ],
    },
  ],
  steps: [
    { text: 'Vérifiez la date de fin de votre passeport : le renouvellement est possible jusqu’à 6 mois avant, ou plus tôt si les pages sont pleines.', src: ['tsa-consulat'] },
    { text: 'Réunissez les pièces de la liste ci-dessus et téléchargez le formulaire sur le site de votre consulat.', src: ['tsa-consulat'] },
    { text: 'Prenez rendez-vous : la présence de la personne est obligatoire pour les empreintes.', src: ['tsa-consulat'] },
    { text: 'Au consulat général de Paris, le renouvellement se fait aussi en ligne depuis le 24 juin 2026 ; l’extension aux autres consulats est en cours.', src: ['tsa-ligne', 'observ-ligne'] },
    { text: 'Suivez votre dossier sur le site du ministère de l’Intérieur.', src: ['interieur'] },
  ],
  faq: [
    { q: 'Combien coûte un passeport en Algérie ?', a: '6 000 DA pour 28 pages, 9 000 DA pour 48 pages. La procédure accélérée coûte 25 000 DA ou 45 000 DA.', src: ['tsa-tarifs'] },
    { q: 'Puis-je renouveler mon passeport en ligne ?', a: 'Oui au consulat général de Paris depuis le 24 juin 2026. Les autres consulats suivent par étapes.', src: ['tsa-ligne', 'observ-ligne'] },
    { q: 'Quand faire la demande ?', a: 'Jusqu’à 6 mois avant la date de fin, ou dès que les pages sont pleines.', src: ['tsa-consulat'] },
  ],
  official: [{ label: 'Ministère de l’Intérieur — suivi du passeport', src: 'interieur' }],
  sources: [
    { id: 'interieur', publisher: 'Ministère de l’Intérieur', date: null, official: true, title: 'Suivi des demandes de passeport', url: 'https://passeport.interieur.gov.dz/' },
    { id: 'tsa-tarifs', publisher: 'TSA', date: '2026-01-08', official: false, title: 'Tarifs du passeport : ce qui change', url: 'https://www.tsa-algerie.com/tarifs-du-passeport-algerien-ce-qui-change-pour-la-diaspora/' },
    { id: 'tsa-consulat', publisher: 'TSA', date: '2024-05-11', official: false, title: 'Refaire son passeport dans un consulat', url: 'https://www.tsa-algerie.com/refaire-son-passeport-algerien-dans-un-consulat-ce-quil-faut-savoir/' },
    { id: 'tsa-ligne', publisher: 'TSA', date: '2026-06-24', official: false, title: 'Renouvellement en ligne lancé pour la diaspora', url: 'https://www.tsa-algerie.com/passeport-algerien-le-renouvellement-en-ligne-officiellement-lance-pour-la-diaspora/' },
    { id: 'observ-ligne', publisher: 'Observ’Algérie', date: '2026-09-10', official: false, title: 'Délivrance à distance bientôt généralisée', url: 'https://observalgerie.com/2026/09/10/immigration/passeport-algerien-la-delivrance-a-distance-bientot-generalisee-dans-les-consulats/' },
    { id: 'algerie-eco', publisher: 'Algérie Eco', date: '2025-11-20', official: false, title: 'Cinq mesures pour la diaspora en 2026', url: 'https://algerie-eco.com/?p=231000' },
  ],
}
