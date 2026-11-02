# Confiance & Vérification

Département responsable : **Trust, Verification & DALIL Excellence**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
Le moteur de confiance : statuts, critères par secteur, sources, date et auteur de vérification, label Excellence.

## Contenu du module
- `verification.ts` : statuts (Repérée, En vérification, Vérifiée, Labellisée Excellence), résultats de critère, libellés publics, `criteriaFor(secteur)`, onglet Payload `verificationTab` réutilisable par toute entité vérifiable.
- Les critères de chaque secteur sont définis dans `platform/referentiel/catalog.ts`.

## Dépend de
`platform/referentiel` uniquement.

## Événements
À venir : prochaine date de vérification, historique, file de revérification (tâche planifiée Vercel).

## Règles propres
- **Indépendance totale vis-à-vis des revenus** : aucun code de `pros` ne peut écrire `verification`, `criteria` ou un label.
- « Vérifiée » exige une date (`verifiedAt`), un vérificateur, au moins une source et les critères — refusé par le serveur sinon (`requireProof`) ; « Labellisée » exige en plus tous les critères évalués, aucun non conforme. Statuts réservés aux administrateurs.
- Ne jamais présenter une information non vérifiée comme vérifiée.

## Accès
Neon (lecture/écriture des champs de vérification uniquement).

## Skills
- `skills/verifier-une-fiche` — Vérifier une fiche DALIL et mettre à jour son statut, ses critères et ses sources.

## Prochaines étapes
- File de revérification (tâche planifiée) à partir de `nextVerificationAt`.

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
