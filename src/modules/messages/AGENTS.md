# Messages

Département responsable : **User Operations & Support**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
La boîte de réception : toutes les demandes venues du site et leur suivi jusqu’à la réponse.

## Contenu du module
- Collection `submissions` (types : contribution, candidature, contact, avis, parcours ; statuts : nouveau, en cours, infos manquantes, traité, refusé).
- `record.ts` : enregistre une demande, alerte l’équipe (lien direct vers /admin), accuse réception à l’expéditeur.
- `notify.ts` : email au demandeur à chaque changement de statut, avec le « Message au demandeur ».

## Dépend de
`platform` (mail, http, accès).

## Événements
Demande créée → alerte équipe ; statut modifié → email au demandeur (hook `afterChange`).

## Règles propres
- « Infos manquantes » et « Refusé » exigent un message au demandeur.
- Ne jamais exposer la note interne.

## Accès
Resend (via `platform/mail`), Neon.

## Skills
- `skills/traiter-une-demande` — Traiter une demande de la boîte de réception DALIL (contribution, candidature, contact).

## Prochaines étapes
- Délais de traitement et relances.
- Vue « Pilotage » des demandes en attente.

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
