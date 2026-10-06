# Membres

Département responsable : **Product & UX**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
L’espace personnel du visiteur : profil test, favoris, listes, checklist, parcours. Plus tard : comptes membres.

## Contenu du module
- `session.ts` : session visiteur (cookie httpOnly `dalil_sid`, 7 jours) stockée dans la collection `visitor-sessions`.
- Routes `/api/test-session`, `/api/me`, `/api/favorites`, `/api/collections`, `/api/checklist`, `/api/diagnostics`.
- `ui/` : MemberSpace (/espace), SaveButton, FavoriteButton, TestExperience.

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
- Comptes membres publics (types de comptes à valider avec Rad : Particulier, Professionnel, Contributeur vérifié).

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
