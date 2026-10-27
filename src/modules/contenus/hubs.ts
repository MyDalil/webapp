/**
 * Pages de rubrique (contenus et liens du prototype validé) au format « application » : en-tête photo, cartes illustrées.
 * Les photos reprennent celles du prototype pour le même sujet.
 */
import type { PhotoKey } from '@/platform/referentiel/photos'

export type HubPhoto = PhotoKey
export type HubCard = { href: string; title: string; sub: string; photo?: HubPhoto; icon: string; tone: 'vert' | 'sable' | 'ciel'; links?: [string, string][] }
export type Hub = { route: string; eyebrow: string; title: string; accent: string; lead: string; photo: HubPhoto; search: string; sections: { title: string; cards: HubCard[] }[] }

const CNL = '/annuaire/culture-nature-loisirs'

export const HUBS: Hub[] = [
  {
    route: '/explorer',
    eyebrow: 'L’Algérie, selon vos envies',
    title: 'Qu’avez-vous envie de',
    accent: 'faire',
    lead: 'Une sortie en famille, une bonne adresse, un service ou un nouveau projet. Le guide s’explore à votre rythme.',
    photo: 'hoggar',
    search: 'Une sortie, un lieu, une idée…',
    sections: [
      {
        title: 'Envies',
        cards: [
          { href: '/guides/choisir-sa-ville', title: 'Villes & Régions', sub: 'Découvrir les territoires et leurs particularités.', photo: 'constantine-pont', icon: 'pin', tone: 'sable', links: [['/guides/choisir-sa-ville', 'Choisir une ville'], ['/que-faire-ce-week-end', 'Culture et événements']] },
          { href: `${CNL}?category=Mus%C3%A9es`, title: 'Culture & Patrimoine', sub: 'Comprendre l’histoire et explorer les lieux culturels.', photo: 'arc-antique', icon: 'building', tone: 'vert', links: [[`${CNL}?category=Mus%C3%A9es`, 'Musées et patrimoine'], ['/que-faire-ce-week-end', 'Culture et événements']] },
          { href: `${CNL}?category=Plages`, title: 'Nature & Plages', sub: 'Préparer une promenade ou une escapade.', photo: 'cascade', icon: 'pin', tone: 'sable', links: [[`${CNL}?category=Plages`, 'Plages'], [`${CNL}?category=Jardins`, 'Jardins et promenades']] },
          { href: CNL, title: 'Activités & Loisirs', sub: 'Trouver des idées pour tous les âges.', photo: 'jardin', icon: 'users', tone: 'vert', links: [[`${CNL}?category=Parcs`, 'Parcs d’attractions'], [CNL, 'Activités en famille']] },
          { href: '/annuaire/restaurants-gastronomie', title: 'Gastronomie', sub: 'Découvrir les cuisines et les bonnes tables.', photo: 'couscous', icon: 'heart', tone: 'sable', links: [['/annuaire/restaurants-gastronomie', 'Restaurants'], ['/annuaire/restaurants-gastronomie?category=Caf%C3%A9s', 'Cafés']] },
          { href: '/que-faire-ce-week-end', title: 'Agenda & Événements', sub: 'Repérer les rendez-vous culturels et les activités.', photo: 'concert', icon: 'list', tone: 'ciel', links: [['/que-faire-ce-week-end', 'Culture et événements'], [CNL, 'Activités en famille']] },
        ],
      },
    ],
  },
  {
    route: '/vie-pratique',
    eyebrow: 'Vie pratique',
    title: 'Tout ce qui facilite votre',
    accent: 'quotidien',
    lead: 'Que vous habitiez en Algérie, soyez de passage ou prépariez une installation : explorez les sujets qui vous concernent.',
    photo: 'alger-ville',
    search: 'Logement, santé, banque…',
    sections: [
      {
        title: 'Au quotidien',
        cards: [
          { href: '/explorer', title: 'Sorties et loisirs', sub: 'Parcs, jardins, musées, plages et activités en famille.', photo: 'jardin', icon: 'users', tone: 'vert' },
          { href: '/guides/restaurants', title: 'Restaurants et cafés', sub: 'Trouver une table et choisir selon ses envies.', photo: 'couscous', icon: 'heart', tone: 'sable' },
          { href: '/guides/services-du-quotidien', title: 'Services du quotidien', sub: 'Artisans, automobile, bien-être et services à domicile.', photo: 'marche', icon: 'grid', tone: 'vert' },
        ],
      },
      {
        title: 'S’organiser',
        cards: [
          { href: '/guides/logement', title: 'Logement', sub: 'Location, achat, quartiers, garanties et points de vigilance.', photo: 'alger-ville', icon: 'home', tone: 'sable' },
          { href: '/guides/sante', title: 'Santé', sub: 'Médecins, cliniques, urgences, assurances et parcours de soin.', photo: 'hopital-moderne', icon: 'health', tone: 'vert' },
          { href: '/guides/ecole-et-famille', title: 'Éducation', sub: 'Écoles, inscriptions, programmes, langues et adaptation des enfants.', photo: 'universite', icon: 'school', tone: 'ciel' },
          { href: '/guides/transport', title: 'Transport', sub: 'Voiture, permis, taxis, VTC, trains, vols intérieurs et mobilité locale.', photo: 'tramway', icon: 'car', tone: 'ciel' },
          { href: '/guides/budget-et-banque', title: 'Banques', sub: 'Comptes, paiements, transferts, devises et documents à préparer.', photo: 'banque-algerie', icon: 'cash', tone: 'sable' },
          { href: '/guides/internet-et-telecoms', title: 'Télécoms', sub: 'Forfaits, internet fixe, fibre, couverture et démarches d’ouverture.', photo: 'telecom', icon: 'list', tone: 'ciel' },
        ],
      },
    ],
  },
  {
    route: '/business-emploi',
    eyebrow: 'Business & emploi',
    title: 'Donner une direction à votre',
    accent: 'projet',
    lead: 'Des repères pour entreprendre, investir et travailler en Algérie.',
    photo: 'oran-panorama',
    search: 'Créer, investir, recruter…',
    sections: [
      {
        title: 'Votre projet',
        cards: [
          { href: '/guides/travail-et-entreprise', title: 'Entreprendre', sub: 'Structurer son activité et préparer sa création.', photo: 'epices', icon: 'briefcase', tone: 'sable', links: [['/demarches/auto-entrepreneur', 'Auto-entrepreneur'], ['/guides/travail-et-entreprise', 'Le guide']] },
          { href: '/recherche?q=investir', title: 'Investir', sub: 'Préparer son projet et identifier les interlocuteurs.', photo: 'oran-panorama', icon: 'cash', tone: 'vert' },
          { href: '/guides/travail-et-entreprise', title: 'Travailler', sub: 'Identifier les démarches correspondant à son métier.', photo: 'alger-ville', icon: 'users', tone: 'ciel' },
          { href: '/annuaire/droit-finance-conseil', title: 'Droit et conseil', sub: 'Trouver un interlocuteur selon son besoin.', icon: 'shield', tone: 'vert' },
          { href: '/recherche?q=douanes', title: 'Import / Export', sub: 'Préparer ses formalités avec les autorités compétentes.', photo: 'port-alger', icon: 'truck', tone: 'sable' },
        ],
      },
    ],
  },
]

export const hubByRoute = (route: string) => HUBS.find((h) => h.route === route) ?? null
