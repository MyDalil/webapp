# Services — prestataires et missions (modèle Yoojo)

Département responsable : **Product & UX + Trust**. Lire aussi `AGENTS.md` à la racine.

## Rôle
Mettre en relation particuliers et prestataires vérifiés (ménage, bricolage, garde d’enfants, cours coraniques…). Le client décrit son besoin et choisit un prestataire (tarif, avis, langues) ; le prestataire accepte ou décline sous 24 h ; échanges dans la messagerie DALIL ; avis après la mission.

## Contenu
- `activities.ts` — 11 catégories et leurs activités (validées par Rad), catégories sensibles, clientèle, genres.
- `Providers.ts` — fiche (nom affiché, genre, langues, clientèle acceptée), prestations (horaire ou forfait, durée indicative), zone (wilaya + communes, rayon prévu), disponibilités hebdomadaires, vérification (identité, statut légal, casier). Publication bloquée par un hook tant que les vérifications exigées manquent.
- `Missions.ts` — demande → acceptée / déclinée / expirée / annulée → terminée. Adresse exacte transmise au prestataire après acceptation.
- `MissionMessages.ts` — messagerie par mission ; numéros et emails masqués avant acceptation.
- `ProviderReviews.ts` — un avis par mission terminée, par son client, avec jusqu’à 4 photos du travail ; note moyenne recalculée ; modération par l’équipe.
- `ProviderDocuments.ts` — pièces justificatives (identité, statut légal, casier) stockées dans la base, lisibles par l’équipe seulement (`/api/equipe/pieces/[id]`, lien dans /admin), supprimées dès la vérification cochée ou au bout de 30 jours.
- `planning.ts` — heures de début possibles selon la durée et les missions acceptées (pur, testé : `planning.test.ts`).
- `marketplace.ts` — recherche, disponibilités, demande, actions, messagerie, avis, espace pro, tâche quotidienne, suppression de compte.
- `emails.ts` — demande, acceptation, refus/expiration, annulation, message, rappel J-1, invitation à l’avis.
- `ui/` — RequestForm (fiche publique), MissionThread (mission + messagerie + avis), MyMissions (client), ProviderSpace (pro).
- Routes : `/api/services/*`, `/api/pro/prestataire`, `/api/communes`, `/api/taches` (tâche quotidienne commune).
- Pages : `/services`, `/services/[categorie]`, `/prestataires/[slug]`, `/missions/[id]`, `/espace-pro?espace=services`.

## Règles propres
- **DALIL n’encaisse rien** : tarif horaire ou forfait affiché, estimation du total, paiement direct au prestataire.
- **Messagerie DALIL uniquement** : aucun numéro affiché par DALIL ; coordonnées masquées dans les messages avant acceptation.
- **Vérifications avant publication** : identité + statut légal (carte auto-entrepreneur ou registre de commerce) pour tous ; casier judiciaire (bulletin n° 3, moins de 3 mois) pour garde d’enfants, aide à domicile, cours particuliers et coraniques. Le document est consulté puis supprimé : seule la date est conservée.
- **Genre** : déclaré par le prestataire et vérifié avec l’identité ; filtre client. Option « réservé aux clientes / aux clients » choisie par le prestataire ; le client déclare son genre seulement dans ce cas.
- **Avis** : seulement le client d’une mission terminée via DALIL, une fois, dans les 60 jours.
- Le pro modifie lui-même ses infos (publiées tout de suite) ; nom affiché et genre changent seulement par l’équipe. Changer de numéro légal retire la vérification.
- **Photos** (profil, avis) : publiées tout de suite puis contrôlées par l’équipe (collection Photos, filtre « À contrôler ») — décision de Rad. Type réel vérifié, métadonnées (GPS…) retirées, réduites dans le navigateur, 4 Mo maximum (`platform/storage/images.ts`).
- **Pièces justificatives** : jamais sur un stockage public ni chez un tiers ; consultées puis supprimées, seule la date de vérification reste.

## Dépend de
`membres` (compte connecté), `platform` (communes, langues, wilayas, mail).

## Prochaines étapes
- Photos des 11 catégories : planche en cours de choix avec Rad (Unsplash, style gros plan).
- Rayon en km (calcul interne depuis le centre des communes, déjà stocké).
- Communes des 11 wilayas en transition dès publication de la liste officielle.
- Abonnement prestataire (module `pros`), jamais lié à la vérification.
