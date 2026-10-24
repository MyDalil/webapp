# Contenus

Département responsable : **Editorial & Knowledge**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
Guides, démarches, pages éditoriales reprises du prototype, et leur rendu dans la coque de la maquette.

## Contenu du module
- `content.ts` : pages extraites du prototype (`pages/*.json`, `routes.json`, `shell.json` pour en-tête et pied de page).
- `ui/Tree` (rendu des arbres), `ui/Legacy` (page du prototype dans la maquette), `ui/islands` (registre des composants interactifs de chaque métier), DiagnosticWizard, ParallaxPhoto.
- Toute route non dédiée passe par `app/(site)/[...slug]`.

## Dépend de
`annuaire`, `membres`, `pros`, `communaute`, `communication`, `recherche` (composants via `/ui`), `platform`.

## Événements
Aucun pour l’instant (contenus statiques). À venir : collection éditoriale dans Payload.

## Règles propres
- Workflow éditorial cible : brouillon → recherche → sources → fact-check → validation → traduction → publication → surveillance → mise à jour.
- Les contenus sensibles (religion, santé, démarches légales) exigent une source officielle.
- Ne pas modifier les JSON à la main pour du contenu durable : préparer la migration vers Payload.

## Accès
Aucun.

## Prochaines étapes
- Migrer guides et démarches vers une collection Payload sourcée et datée.
- Traduction AR/EN à la fin du chantier (script `scripts/i18n-extract.py`).

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
