import type { Demarche } from './types'

/** Statut d’auto-entrepreneur (loi 22-23 du 18/12/2022). Sources relevées le 27/10/2026. */
export const AUTO_ENTREPRENEUR: Demarche = {
  slug: 'auto-entrepreneur',
  title: 'Devenir auto-entrepreneur',
  short: 'Auto-entrepreneur',
  category: 'entreprise',
  icon: 'briefcase',
  tone: 'sable',
  image: '/images/demarches/auto-entrepreneur.svg',
  summary: 'Travailler à votre compte sans registre de commerce, avec un impôt simple.',
  lead: 'Le statut le plus simple pour exercer une activité à votre compte en Algérie.',
  where: 'En ligne (ANAE)',
  checked: '2026-10-27',
  keyPoints: [
    { icon: 'cash', label: 'Impôt', value: '0,5 % du chiffre d’affaires', src: ['a360-ae'] },
    { icon: 'grid', label: 'Plafond', value: '5 M DA par an', src: ['a360-ae'] },
    { icon: 'building', label: 'Registre de commerce', value: 'Non exigé', src: ['jo-22-23', 'a360-ae'] },
    { icon: 'clock', label: 'Déclaration aux impôts', value: 'Sous 30 jours', src: ['jo-22-23'] },
  ],
  outline: ['Vérifier votre activité', 'Vous inscrire en ligne', 'Déclarer aux impôts', 'Vous affilier à la sécurité sociale'],
  sections: [
    {
      title: 'Qui peut en bénéficier',
      facts: [
        { text: 'Une personne de nationalité algérienne, ou un résident étranger, qui réside en Algérie.', src: ['a360-ae'] },
        { text: 'Une activité de la liste des activités éligibles (plus de 1 300).', src: ['a360-ae'] },
        { text: 'Un chiffre d’affaires annuel de 5 millions de DA au plus.', src: ['a360-ae'] },
      ],
    },
    {
      title: 'Ce que le statut vous donne',
      facts: [
        { text: 'Une inscription au registre national et une carte d’auto-entrepreneur.', src: ['jo-22-23'] },
        { text: 'Aucun registre de commerce ni local commercial exigé.', src: ['jo-22-23', 'a360-ae'] },
        { text: 'Un impôt forfaitaire de 0,5 % du chiffre d’affaires.', src: ['a360-ae'] },
        { text: 'Votre résidence principale ne peut pas être saisie pour les dettes de l’activité.', src: ['jo-22-23'] },
      ],
    },
  ],
  steps: [
    { text: 'Vérifiez que votre activité figure dans la liste des activités éligibles.', src: ['a360-ae'] },
    { text: 'Inscrivez-vous sur la plateforme de l’Agence nationale de l’auto-entrepreneur (anae.dz).', src: ['a360-ae'] },
    { text: 'Recevez votre carte d’auto-entrepreneur.', src: ['jo-22-23'] },
    { text: 'Déposez votre déclaration d’existence aux impôts dans les 30 jours.', src: ['jo-22-23'] },
    { text: 'Affiliez-vous à la sécurité sociale des non-salariés (CASNOS), en ligne sur Damancom.', src: ['jo-22-23', 'a360-ae'] },
  ],
  faq: [
    { q: 'Faut-il un registre de commerce ?', a: 'Non. Le statut en dispense.', src: ['jo-22-23', 'a360-ae'] },
    { q: 'Combien d’impôt vais-je payer ?', a: '0,5 % de votre chiffre d’affaires, dans la limite de 5 millions de DA par an.', src: ['a360-ae'] },
    { q: 'Un étranger peut-il devenir auto-entrepreneur ?', a: 'Oui, s’il réside en Algérie.', src: ['a360-ae'] },
  ],
  official: [
    { label: 'Loi 22-23 du 18 décembre 2022 (Journal officiel n° 85)', src: 'jo-22-23' },
    { label: 'Agence nationale de l’auto-entrepreneur', src: 'anae' },
  ],
  sources: [
    { id: 'jo-22-23', publisher: 'Journal officiel (via OIT NATLEX)', date: '2022-12-18', official: true, title: 'Loi 22-23 portant statut de l’auto-entrepreneur', url: 'https://natlex.ilo.org/dyn/natlex2/natlex2/files/download/114274/DZA-114274.pdf' },
    { id: 'anae', publisher: 'ANAE', date: null, official: true, title: 'Plateforme de l’auto-entrepreneur', url: 'https://anae.dz/' },
    { id: 'a360-ae', publisher: 'Algérie360', date: '2024-02-13', official: false, title: 'Carte d’auto-entrepreneur : inscription et conditions', url: 'https://www.algerie360.com/carte-dauto-entrepreneur-inscription-avantages-et-conditions-deligibilite/' },
  ],
}
