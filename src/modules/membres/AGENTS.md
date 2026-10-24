# Membres

Département responsable : **Product & UX**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
Les comptes publics (particulier, espace pro activable) et l’espace personnel rattaché au compte : profil (ville, intérêts), favoris, listes, préparation, parcours, demandes.

## Contenu du module
- `session.ts` : espace personnel du membre connecté, stocké dans le champ `space` du compte (écrit seulement par le serveur). Plus de profil test : sans compte, l’interface ouvre la fenêtre de connexion. `visitor-sessions` ne reçoit plus rien (anciennes données du prototype).
- Routes `/api/test-session`, `/api/me`, `/api/favorites`, `/api/collections`, `/api/checklist`, `/api/diagnostics`.
- `Members.ts` : comptes publics (auth Payload, email vérifié, mot de passe oublié). Inscription uniquement via `/api/compte` ; `kind` = particulier ou pro (l’espace pro s’active sur le même compte).
- Routes `/api/members/login` et `/api/members/forgot-password` remplacent celles de Payload pour ajouter la limitation par IP (le verrouillage par compte de Payload reste actif).
- `/api/compte/export` : téléchargement JSON de toutes les données du compte (compte, rendez-vous, demandes, messages, avis, photos, fiches pro) — droit d’accès et de portabilité.
- Pages `/connexion`, `/connexion/[particulier|professionnel]`, `/connexion/verifier`, `/connexion/nouveau-mot-de-passe`, `/mon-compte` (rendez-vous, missions, profil, favoris, listes, informations). `/espace`, `/test`, `/onboarding` renvoient vers Mon compte (ou l’inscription).
- `ui/` : AuthPanel, AccountActions, MySpace (sections de Mon compte), SaveButton, FavoriteButton.

## Dépend de
`messages` (parcours, contacts), `platform`.

## Événements
Aucun.

## Règles propres
- Données personnelles minimales ; suppression de la session à la demande.
- Comptes membres : vérification d’email, mot de passe oublié, export et suppression des données (RGPD, loi 18-07) en place.

## Accès
Neon (comptes).

## Prochaines étapes
- Purger la collection `visitor-sessions` (données du prototype) puis la retirer.

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
