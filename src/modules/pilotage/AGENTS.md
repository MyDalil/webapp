# Pilotage

Département responsable : **CEO Office & Strategy**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
La vue de direction dans /admin : objectifs, indicateurs, demandes en attente, fiches à revérifier, santé technique, décisions.

## Contenu du module
Le cockpit de /admin (`admin/`) :
- `nav.ts` : menu (groupes, cibles, repli vers les collections Payload, filtre par rôle) — testé ;
- `../kpis.ts` : indicateurs et badges (accès aux données injecté) — testé ;
- `CockpitNav`, `CockpitBar` (palette ⌘K, langue FR/AR/EN, thème), `PilotageView` (accueil), `Brand` ;
- `i18n.ts` : textes FR/AR/EN ; `cockpit.scss` : jetons clair/sombre, aussi appliqués aux écrans natifs ;
- `data.ts` : `COCKPIT_VIEWS` (écrans livrés : chaque lot y ajoute les siens).
Feuille de route : `docs/superpowers/plans/2026-11-14-cockpit-admin-feuille-de-route.md`.

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
- Registre des décisions, risques et incidents.

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
