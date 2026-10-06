# Professionnels

Département responsable : **Professional Network & Revenue**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
Le parcours des professionnels : candidature, identité, justificatifs, validation, abonnement, renouvellement.

## Contenu du module
- `ui/ApplicationForm` (email obligatoire) → `/api/applications` → demande enregistrée par `messages`.

## Dépend de
`messages`, `platform/referentiel`.

## Événements
Candidature reçue → alerte équipe + accusé ; statut « traité » → email rappelant qu’un abonnement n’est pas un label.

## Règles propres
- **Ne jamais écrire dans `confiance`** : un abonnement n’achète ni statut, ni critère, ni label.
- Pipeline cible : prospect → candidature → identité → justificatifs → vérification → corrections → validation → publication → abonnement → suivi → renouvellement → nouvelle vérification.

## Accès
Aucun en direct ; paiements plus tard.

## Prochaines étapes
- Fiches professionnelles et espace pro.
- Abonnements et paiements (fournisseur à choisir).

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
