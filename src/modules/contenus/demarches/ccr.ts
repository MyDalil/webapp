import type { Demarche, Source } from './types'

/** Certificat de changement de résidence (CCR). Sources relevées le 27/10/2026 ; la presse est signalée comme telle. */
export const CCR_CHECKED = '2026-10-27'

export const CCR_SOURCES: Source[] = [
  {
    id: 'mfa',
    publisher: 'Ministère des Affaires étrangères',
    date: null,
    official: true,
    title: 'Certificat de changement de résidence et radiation',
    url: 'https://www.mfa.gov.dz/en/services-for-algerians/certificate-of-change-of-residence-and-de-registration',
  },
  {
    id: 'oslo',
    publisher: 'Ambassade d’Algérie à Oslo',
    date: null,
    official: true,
    title: 'Formulaire de demande de CCR',
    url: 'https://emboslo.mfa.gov.dz/media/emboslo/files/pdf/CCR.pdf',
  },
  {
    id: 'a360-lf',
    publisher: 'Algérie360',
    date: '2026-09-22',
    official: false,
    title: 'CCR : véhicule de moins de 5 ans (LF 2026)',
    url: 'https://www.algerie360.com/ccr-voiture-moins-de-5-ans-algerie/',
  },
  {
    id: 'a360-cond',
    publisher: 'Algérie360',
    date: '2026-04-25',
    official: false,
    title: 'Conditions et documents exigés',
    url: 'https://www.algerie360.com/importation-de-vehicules-de-moins-de-5-ans-les-conditions-et-documents-exiges/',
  },
  {
    id: 'tsa-etat',
    publisher: 'TSA',
    date: '2026-04-26',
    official: false,
    title: 'Les trois conditions du véhicule',
    url: 'https://www.tsa-algerie.com/importation-de-vehicules-de-moins-de-5-ans-lalgerie-fixe-3-conditions/',
  },
  {
    id: 'observ',
    publisher: 'Observ’Algérie',
    date: '2026-04-27',
    official: false,
    title: 'Les nouvelles règles des consulats',
    url: 'https://observalgerie.com/2026/04/27/economie/importation-de-vehicules-par-ccr-les-nouvelles-regles-des-consulats-algeriens/',
  },
  {
    id: 'nomades',
    publisher: 'Algérie Nomades',
    date: '2026-07-26',
    official: false,
    title: 'Droits de chancellerie (consulat de Nantes)',
    url: 'https://algerienomades.com/certificat-changement-residence-algerie/',
  },
  {
    id: 'a360-plf',
    publisher: 'Algérie360',
    date: '2026-10-09',
    official: false,
    title: 'CCR et projet de loi de finances 2027',
    url: 'https://www.algerie360.com/importation-voiture-ccr-plf-2027/',
  },
]

export const CCR: Demarche = {
  slug: 'ccr',
  title: 'Certificat de changement de résidence (CCR)',
  short: 'Changement de résidence (CCR)',
  category: 'diaspora',
  icon: 'truck',
  tone: 'vert',
  image: '/images/photos/ferry.webp',
  credit: 'Ferry Badji Mokhtar III d’Algérie Ferries · Bertrand Soubeyrand · CC BY-SA 4.0',
  summary: 'Rentrer vivre en Algérie avec vos effets et votre véhicule, sans droits de douane.',
  where: 'Consulat de résidence',
  checked: CCR_CHECKED,
  sources: CCR_SOURCES,
  keyPoints: [
    { icon: 'clock', label: 'À l’étranger', value: '3 ans minimum', src: ['a360-cond', 'oslo'] },
    { icon: 'building', label: 'Lieu', value: 'Consulat', src: ['oslo'] },
    { icon: 'car', label: 'Véhicule', value: 'Moins de 5 ans', src: ['a360-lf'] },
    { icon: 'file', label: 'Validité', value: '6 mois', src: ['oslo', 'nomades'] },
  ],
  outline: [
    'Vérifier votre éligibilité',
    'Rassembler les pièces',
    'Respecter les plafonds',
    'Déposer au consulat',
  ],
  lead: 'Rentrer vivre en Algérie avec vos effets personnels et votre véhicule, en franchise de droits.',
  sections: [
    {
      title: 'Qui peut en bénéficier',
      facts: [
        { text: 'Avoir plus de 19 ans.', src: ['a360-cond'] },
        {
          text: 'Avoir résidé au moins 3 ans sans interruption hors d’Algérie.',
          src: ['a360-cond', 'oslo'],
        },
        {
          text: 'Être inscrit au consulat de votre lieu de résidence (immatriculation consulaire).',
          src: ['a360-cond', 'oslo'],
        },
        { text: 'Rentrer pour vous installer définitivement en Algérie.', src: ['mfa'] },
        {
          text: 'Ne pas avoir déjà bénéficié du CCR — ni vous, ni votre conjoint.',
          src: ['a360-cond', 'oslo'],
        },
      ],
    },
    {
      title: 'Le véhicule et le plafond',
      facts: [
        {
          text: 'Neuf ou de moins de 5 ans, âge compté à l’entrée sur le territoire douanier algérien.',
          src: ['a360-lf', 'observ'],
        },
        {
          text: 'Essence, hybride essence-électrique ou électrique. Le diesel est exclu.',
          src: ['a360-lf', 'a360-plf'],
        },
        {
          text: 'Voiture de tourisme : 1 800 cm³ au plus. Utilitaire : 5,95 t au plus.',
          src: ['a360-lf'],
        },
        {
          text: 'Documents : carte grise originale, facture d’achat, certificat de conformité (COC), contrôle technique, certificat de non-gage.',
          src: ['a360-cond', 'observ'],
        },
        {
          text: 'En bon état et conforme : un expert agréé des Mines le contrôle. Un véhicule refusé est réexporté à vos frais.',
          src: ['tsa-etat', 'observ'],
        },
        {
          text: 'Plafond de la franchise : 10 millions de DA ; 8 millions de DA pour les étudiants et stagiaires.',
          src: ['a360-lf', 'a360-plf'],
        },
      ],
    },
  ],
  steps: [
    {
      text: 'Vérifiez les conditions ci-dessus et l’âge exact du véhicule à la date prévue d’arrivée.',
      src: ['a360-lf'],
    },
    { text: 'Prenez rendez-vous au consulat où vous êtes inscrit.', src: ['oslo'] },
    {
      text: 'Remplissez le formulaire de votre consulat : carte consulaire, passeport, titre de séjour, preuve de 3 ans de résidence, inventaire détaillé et chiffré de vos effets, documents du véhicule.',
      src: ['oslo', 'a360-cond'],
    },
    {
      text: 'Payez les droits de chancellerie. Chaque consulat fixe son tarif — par exemple à Nantes : 40 € plus 4 € par tranche de 100 € déclarés, moitié prix pour les étudiants.',
      src: ['nomades'],
    },
    {
      text: 'Expédiez vos biens dans les 6 mois : c’est la durée de validité du certificat.',
      src: ['oslo', 'nomades'],
    },
    {
      text: 'À l’arrivée, présentez le CCR à la douane pour le dédouanement en franchise.',
      src: ['a360-lf'],
    },
    {
      text: 'Une fois installé, demandez votre radiation consulaire : carte consulaire, copie d’une pièce d’identité, certificat de résidence de votre commune.',
      src: ['mfa'],
    },
  ],
  faq: [
    {
      q: 'Combien de temps faut-il avoir vécu à l’étranger ?',
      a: 'Au moins 3 ans sans interruption, avec une inscription au consulat.',
      src: ['a360-cond', 'oslo'],
    },
    {
      q: 'Puis-je ramener un véhicule d’occasion ?',
      a: 'Oui, s’il a moins de 5 ans à l’entrée en Algérie, roule à l’essence, en hybride ou à l’électricité, et ne dépasse pas 1 800 cm³ pour une voiture de tourisme.',
      src: ['a360-lf'],
    },
    {
      q: 'Combien coûte le CCR ?',
      a: 'Les droits de chancellerie varient selon le consulat (exemple de Nantes ci-dessus). La loi de finances 2026 fixe une redevance équivalente à 1 000 DA, payée en devises. Le projet de loi de finances 2027 propose 20 000 DA : ce n’est pas adopté.',
      src: ['nomades', 'a360-plf'],
    },
    {
      q: 'Puis-je en bénéficier deux fois ?',
      a: 'Non. Le CCR s’accorde une seule fois, et pas si votre conjoint en a déjà bénéficié.',
      src: ['a360-cond'],
    },
    {
      q: 'Que se passe-t-il si le véhicule n’est pas conforme ?',
      a: 'Il doit être réexporté, à vos frais.',
      src: ['tsa-etat', 'observ'],
    },
  ],
  official: [
    { label: 'Ministère des Affaires étrangères — CCR et radiation', src: 'mfa' },
    {
      label:
        'Exemple de formulaire CCR (ambassade d’Algérie à Oslo) — chaque consulat publie le sien',
      src: 'oslo',
    },
  ],
}
