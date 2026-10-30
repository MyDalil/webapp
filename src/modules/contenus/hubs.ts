/**
 * Pages de rubrique (contenus et liens du prototype validé) au format « application » : en-tête photo, cartes illustrées.
 * Les photos reprennent celles du prototype pour le même sujet.
 */
import type { PhotoKey } from '@/platform/referentiel/photos'

export type HubPhoto = PhotoKey
export type HubCard = { href: string; title: string; sub: string; photo?: HubPhoto; icon: string; tone: 'vert' | 'sable' | 'ciel'; links?: [string, string][] }
export type Hub = { route: string; eyebrow: string; title: string; accent: string; lead: string; photo: HubPhoto; search: string; sections: { title: string; id?: string; cards: HubCard[] }[] }

const CNL = '/annuaire/culture-nature-loisirs'

export const HUBS: Hub[] = [
  {
    // Rubrique Services (plan revu avec Rad, 2026-10-30) : santé d’abord, puis services à domicile (liste des prestataires après le clic).
    route: '/services',
    eyebrow: 'Services',
    title: 'De quoi avez-vous',
    accent: 'besoin',
    lead: 'Médecins, artisans, aide à domicile : des professionnels vérifiés par DALIL, près de chez vous.',
    photo: 'hopital-moderne',
    search: 'Pédiatre, plombier, ménage…',
    sections: [
      {
        title: 'Santé',
        cards: [
          { href: '/praticiens', title: 'Prendre rendez-vous', sub: 'Médecins et praticiens vérifiés, au cabinet ou en visio.', photo: 'hopital-moderne', icon: 'health', tone: 'ciel' },
          { href: '/annuaire/sante-soins', title: 'Établissements de santé', sub: 'Hôpitaux, cliniques, pharmacies et laboratoires.', photo: 'pharmacie', icon: 'health', tone: 'ciel' },
        ],
      },
      {
        title: 'À domicile',
        id: 'domicile',
        cards: [
          { href: '/services/menage', title: 'Ménage', sub: 'Ménage régulier, grand ménage, fin de chantier.', photo: 'svc-menage', icon: 'home', tone: 'ciel' },
          { href: '/services/bricolage', title: 'Bricolage', sub: 'Montage, plomberie, électricité, peinture.', photo: 'svc-bricolage', icon: 'briefcase', tone: 'sable' },
          { href: '/services/demenagement', title: 'Déménagement', sub: 'Aide au déménagement, transport en fourgon.', photo: 'svc-demenagement', icon: 'truck', tone: 'sable' },
          { href: '/services/jardinage', title: 'Jardinage', sub: 'Tonte, taille, entretien du jardin.', photo: 'svc-jardinage', icon: 'heart', tone: 'vert' },
          { href: '/services/garde-enfants', title: 'Garde d’enfants', sub: 'Baby-sitting, sortie d’école, aide aux devoirs.', photo: 'svc-garde-enfants', icon: 'users', tone: 'ciel' },
          { href: '/services/garde-animaux', title: 'Garde d’animaux', sub: 'Garde, promenade, visites.', photo: 'svc-garde-animaux', icon: 'heart', tone: 'vert' },
          { href: '/services/informatique', title: 'Informatique', sub: 'Dépannage, internet et wifi, smartphone.', photo: 'svc-informatique', icon: 'grid', tone: 'ciel' },
          { href: '/services/aide-domicile', title: 'Aide à domicile', sub: 'Compagnie, courses, repas des personnes âgées.', photo: 'svc-aide-domicile', icon: 'users', tone: 'sable' },
          { href: '/services/cours-particuliers', title: 'Cours particuliers', sub: 'Soutien scolaire, langues, préparation aux examens.', photo: 'svc-cours', icon: 'school', tone: 'ciel' },
          { href: '/services/cours-coraniques', title: 'Cours coraniques', sub: 'Lecture du Coran, tajwid, mémorisation.', photo: 'coran', icon: 'book', tone: 'vert' },
          { href: '/services/coach-sportif', title: 'Coach sportif', sub: 'Remise en forme, musculation, yoga.', photo: 'svc-sport', icon: 'heart', tone: 'sable' },
        ],
      },
      {
        title: 'Professionnels',
        cards: [
          { href: '/annuaire/maison-travaux', title: 'Maison & travaux', sub: 'Artisans, entreprises du bâtiment, entretien.', photo: 'svc-artisans', icon: 'briefcase', tone: 'sable' },
          { href: '/annuaire/droit-finance-conseil', title: 'Droit & finance', sub: 'Avocats, notaires, comptables, banques.', photo: 'banque-algerie', icon: 'cash', tone: 'vert' },
          { href: '/annuaire/transports-mobilite', title: 'Transports & mobilité', sub: 'Taxis, location de voitures, gares.', photo: 'tramway', icon: 'car', tone: 'ciel' },
        ],
      },
    ],
  },
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
