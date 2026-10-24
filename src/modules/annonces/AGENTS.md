# Annonces — immobilier, emploi, véhicules, objets

Département responsable : **Product & UX + Trust**. Lire aussi `AGENTS.md` à la racine.

## Rôle
Petites annonces entre membres, partout en Algérie : immobilier, emploi, véhicules, objets. Dépôt gratuit. Chaque annonce est contrôlée par un humain avant publication. Les échanges passent par la messagerie DALIL.

## Contenu
- `referentiel.ts` — catalogue (4 catégories, sous-catégories, caractéristiques par catégorie), états, avis d’agent, règles chiffrées (`RULES`), prix affiché, caractéristiques lisibles, masquage des coordonnées, renouvellement. Pur.
- `validate.ts` — contrôle et nettoyage d’une annonce envoyée par son auteur. Pur, testé (`validate.test.ts`).
- `Classifieds.ts` — collection `classifieds` (Annonces) : annonce, caractéristiques, lieu, auteur, contrôle (état, motif de refus, dates, signalements, avis de l’agent).
- `ClassifiedMessages.ts` — collection `classified-messages` : une conversation = une annonce + une personne intéressée.
- `market.ts` — recherche, compteurs, page d’annonce, dépôt, modification, actions (renouveler, retirer, supprimer), espace membre, messagerie, signalement, tâche quotidienne, suppression et export des données du compte.
- `emails.ts` — reçue, publiée, refusée, expire bientôt, expirée, nouveau message.
- `refresh.ts` — rafraîchit l’accueil, la rubrique, la catégorie et l’annonce.
- `ui/` — ClassifiedForm (dépôt, modification), ClassifiedChat (messagerie), MyClassifieds (espace membre), ReportForm (signalement), Gallery (photos).
- Routes : `/api/annonces` (GET mes annonces, POST dépôt), `/api/annonces/[id]` (PUT modification, POST action), `/api/annonces/[id]/messages`, `/api/annonces/[id]/signaler`, `/api/taches` (tâche quotidienne commune).
- Pages : `/annonces`, `/annonces/[categorie]`, `/annonces/[categorie]/[slug]`, `/annonces/deposer` (`?modifier=ID`), `/annonces/messagerie?annonce=ID&contact=ID`, bloc « Mes annonces » de `/mon-compte`.

## Cycle de vie
À contrôler → Publiée (45 jours) → Expirée (renouvelable) ; ou Refusée (motif envoyé) ; ou Retirée par l’auteur. Une modification remet l’annonce « À contrôler ». Trois signalements la remettent « À contrôler ».

## Règles propres
- **Rien n’est publié sans un humain** (équipe, rôle staff). Un agent donne seulement son avis (`agentVerdict`, `agentNote`) : le code refuse tout autre champ.
- **Compte confirmé** pour déposer et pour écrire. 10 annonces en cours par particulier, 50 par professionnel.
- **Messagerie DALIL** : la personne intéressée écrit en premier ; ses numéros et emails sont masqués tant que l’annonceur n’a pas répondu.
- **Emploi** : aucune annonce ne demande de paiement au candidat (refus).
- **Photos** : 8 au plus, contrôlées (type réel, métadonnées retirées, 4 Mo), enregistrées « À contrôler » dans Photos.
- **DALIL n’encaisse rien** et ne garantit pas la transaction : conseils de sécurité sur chaque annonce.
- Données du compte : supprimées avec le compte, incluses dans l’export.

## Dépend de
`membres` (compte connecté), `messages` (signalements dans la boîte de réception), `platform` (wilayas, communes, photos, mail, limites de débit).

## Interconnexions
- Accueil et menu : porte, section et rubrique « Annonces » (ordre validé par Rad).
- Agents : rubrique `annonces`, outil `review-classifieds` ; l’agent Trust lit les annonces à contrôler et écrit son avis.
- Recherche : suggestion « Location d’appartement » sous la barre de l’accueil.

## Accès
Neon (lecture/écriture par Payload), Vercel Blob (photos).

## Skills
- `skills/moderer-une-annonce` — Contrôler une annonce dans /admin, puis la publier ou la refuser.

## Prochaines étapes
- Brancher l’avis automatique de l’agent Trust à chaque dépôt, quand l’exécution des agents existe.
- Annonces dans la recherche guidée (`/recherche`).
- Mise en avant payante éventuelle (module `pros`), jamais liée au contrôle.

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
