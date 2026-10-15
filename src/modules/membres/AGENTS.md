# Membres

Département responsable : **Product & UX**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
L’espace personnel du visiteur : profil test, favoris, listes, checklist, parcours. Plus tard : comptes membres.

## Contenu du module
- `session.ts` : session visiteur (cookie httpOnly `dalil_sid`, 7 jours) stockée dans la collection `visitor-sessions`.
- Routes `/api/test-session`, `/api/me`, `/api/favorites`, `/api/collections`, `/api/checklist`, `/api/diagnostics`.
- `Members.ts` : comptes publics (auth Payload, email vérifié, mot de passe oublié). Inscription uniquement via `/api/compte` ; `kind` = particulier ou pro (l’espace pro s’active sur le même compte).
- Pages `/connexion`, `/connexion/[particulier|professionnel]`, `/connexion/verifier`, `/connexion/nouveau-mot-de-passe`, `/mon-compte`.
- `ui/` : AuthPanel, AccountActions, MemberSpace (/espace, profil test du prototype), SaveButton, FavoriteButton, TestExperience.

## Dépend de
`messages` (parcours, contacts), `platform`.

## Événements
Aucun.

## Règles propres
- Données personnelles minimales ; suppression de la session à la demande.
- Les comptes membres réels exigeront : vérification d’email, bienvenue, mot de passe oublié, export et suppression des données (RGPD).

## Accès
Neon (sessions visiteurs).

## Prochaines étapes
- Comptes membres publics : un compte par personne (Particulier), avec un espace Professionnel activable en plus.

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
