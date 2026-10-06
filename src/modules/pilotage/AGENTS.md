# Pilotage

Département responsable : **CEO Office & Strategy**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
La vue de direction dans /admin : objectifs, indicateurs, demandes en attente, fiches à revérifier, santé technique, décisions.

## Contenu du module
Rien de codé pour l’instant : ce module accueillera la page d’accueil « Pilotage » de /admin.

## Dépend de
Lit les autres modules par leurs portes, n’en modifie aucun.

## Événements
Écoutera les événements des autres modules.

## Règles propres
- Le pilotage observe et décide ; il n’écrit pas dans les données métier à la place des modules.
- Format des décisions : État, Problème, Risque, Décision, Actions, Responsable, Dépendances, Preuve de fin.

## Accès
Vercel et Neon en lecture (santé, coûts).

## Prochaines étapes
- Tableau de bord d’accueil de /admin.
- Registre des décisions, risques et incidents.

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
