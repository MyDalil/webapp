export type PageSeed = { slug: string; title: string; intro?: string; body: string; publish: boolean }

/**
 * publish: true → contenu factuel ou repris du prototype validé.
 * publish: false → texte juridique à compléter (éditeur, contact) avant mise en ligne.
 */
export const PAGES: PageSeed[] = [
  {
    slug: 'methode',
    title: 'Notre méthode',
    intro: 'Comment DALIL sélectionne, vérifie et date ses informations.',
    publish: true,
    body: `## Des informations datées et sourcées
Chaque fiche et chaque guide indique ce qui a été vérifié, quand et à partir de quelle source.

## Une donnée inconnue n’est jamais présentée comme acquise
Quand une information n’est pas confirmée, elle est signalée comme telle. Horaires, prix et conditions se confirment toujours auprès de l’établissement ou de l’organisme concerné.

## Présence dans l’annuaire et label sont deux choses distinctes
Être présent dans l’annuaire ne signifie pas être labellisé. Le label DALIL Excellence est une décision distincte, motivée et datée. Il ne s’achète pas.

## Rien n’est publié sans validation humaine
Les contenus peuvent être préparés avec des outils, mais chaque publication est relue et validée par l’équipe éditoriale.

## Signaler une erreur
Chaque fiche permet de signaler une information à corriger. Les signalements sont traités et la fiche est mise à jour avec une nouvelle date de vérification.`,
  },
  {
    slug: 'label',
    title: 'Le label DALIL Excellence',
    intro: 'Reconnaître une qualité exceptionnelle, secteur par secteur.',
    publish: true,
    body: `## La sélection
Le dossier permet de vérifier l’activité, ses informations et les exigences communes de DALIL. Être présent dans l’annuaire ne signifie pas être labellisé.

## L’évaluation
Une école, un restaurant et un spa ont des critères différents. Les constats, les sources et les limites doivent être documentés.

## Le label Excellence
Une décision distincte, motivée et datée. L’abonnement professionnel ne permet pas d’acheter le label.

## Une méthode en cours de finalisation
Le nom définitif, les barèmes, la durée de validité et le renouvellement seront arrêtés avant toute attribution. Aucun label n’est attribué à ce jour.`,
  },
  {
    slug: 'cookies',
    title: 'Cookies',
    intro: 'DALIL ne dépose aucun cookie publicitaire ni de mesure d’audience tierce.',
    publish: true,
    body: `## Ce que le site utilise
- Une préférence d’affichage (thème clair ou sombre) enregistrée dans votre navigateur. Elle ne sert qu’à l’affichage et n’est pas transmise.
- Un cookie de session réservé à l’équipe éditoriale, uniquement sur l’espace d’administration.

## Ce que le site n’utilise pas
- Aucun cookie publicitaire.
- Aucun traceur de réseau social.
- Aucune mesure d’audience tierce.

Si cela change, cette page sera mise à jour et votre consentement sera demandé au préalable.`,
  },
  {
    slug: 'credits-photos',
    title: 'Crédits photos',
    intro: 'Chaque image publiée sur DALIL est créditée : auteur, licence et source.',
    publish: true,
    body: `Les crédits sont renseignés image par image et affichés ici au fur et à mesure de la publication.

Vous êtes l’auteur d’une image et souhaitez une correction ou un retrait ? Écrivez-nous via la page « Donner mon avis ».`,
  },
  {
    slug: 'mentions-legales',
    title: 'Mentions légales',
    publish: false,
    body: `## Éditeur du site
[À compléter : dénomination, forme juridique, adresse, immatriculation, directeur de la publication, contact.]

## Hébergement
Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.

## Base de données
Neon (Databricks), région Europe.

## Propriété intellectuelle
Les textes et la structure du site sont protégés. Les images restent la propriété de leurs auteurs, crédités sur la page dédiée.`,
  },
  {
    slug: 'confidentialite',
    title: 'Politique de confidentialité',
    publish: false,
    body: `## Données collectées
- Newsletter : adresse email, langue, date de consentement.
- Formulaires (proposer une adresse, professionnels, avis) : les informations que vous saisissez.

## Finalités
Traiter votre demande et, si vous l’avez choisi, vous envoyer la newsletter. Aucune revente, aucun usage publicitaire.

## Durée de conservation
[À compléter.]

## Vos droits
Accès, rectification, suppression, opposition : [À compléter : adresse de contact].

## Responsable du traitement
[À compléter.]`,
  },
  {
    slug: 'conditions-utilisation',
    title: 'Conditions d’utilisation',
    publish: false,
    body: `## Objet
DALIL est un guide d’information. Les informations publiées sont fournies à titre indicatif et se confirment auprès des établissements et organismes concernés.

## Contributions
Les propositions d’adresses et signalements sont vérifiés avant publication. DALIL peut refuser une contribution sans justification.

## Responsabilité
[À compléter.]`,
  },
  {
    slug: 'charte-professionnels',
    title: 'Charte des professionnels',
    publish: false,
    body: `## Engagements du professionnel
- Fournir des informations exactes et les mettre à jour.
- Signaler tout changement d’adresse, d’horaires ou d’activité.

## Engagements de DALIL
- Vérifier les informations avant publication et dater chaque vérification.
- Distinguer clairement présence dans l’annuaire et label.
- Ne jamais vendre le label.

## Tarifs
[À compléter : le tarif est communiqué avant toute souscription.]`,
  },
]
