# Communauté

Département responsable : **User Operations & Support**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
Les contributions du public : proposer une adresse, signaler une erreur, donner un avis.

## Contenu du module
- `ui/ContributionForm` (page /proposer) → route `/api/contributions` → demande enregistrée par `messages`.

## Dépend de
`messages` (enregistrement et suivi), `platform/referentiel`.

## Événements
Contribution reçue → alerte équipe + accusé de réception (via `messages`).

## Règles propres
- Une contribution n’est jamais publiée telle quelle : elle passe par `annuaire` + `confiance`.
- Pièces jointes : seuls nom, taille et type sont enregistrés pour l’instant.

## Accès
Aucun en direct.

## Prochaines étapes
- Stocker les pièces jointes (Vercel Blob, contrôle du type et de la taille).
- Avis publics réservés aux visites passées par DALIL (preuve de visite), email confirmé, un avis par visite, modération, anti-fraude, droit de réponse, sans effet sur `confiance`.

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
