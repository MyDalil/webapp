# Décisions — Pilotage

Format : `- AAAA-MM-JJ — décision — raison`. Ne jamais réécrire une entrée : en ajouter une nouvelle qui la remplace.

- 2026-10-06 — module créé lors de la réorganisation par métiers — chaque métier évolue indépendamment avec sa mémoire.
- 2026-11-14 — cockpit /admin (lot 1) : menu, barre ⌘K, accueil Pilotage remplacent l’habillage Payload par ses points d’extension officiels (`Nav`, `actions`, `views.dashboard`, `graphics`) ; les écrans natifs restent, habillés par les mêmes jetons — mises à jour de Payload sans réécriture.
- 2026-11-14 — menu par rôle : un conseiller ne voit que l’accompagnement, même si d’autres collections sont lisibles en public — règle de `src/platform/access.ts`.
- 2026-11-14 — l’admin s’ouvre en français tant qu’aucune langue n’est choisie (`src/proxy.ts`, limité à /admin) — Payload suivait la langue du navigateur (anglais).
- 2026-11-14 — menu ouvert par défaut au-dessus de 1024 px — Payload le fermait sur tout écran ≤ 1440 px, donc sur la plupart des ordinateurs.
- 2026-11-14 — erreur à ne pas refaire : lancer les e2e sans `pnpm search:index` fait échouer la « Recherche complète » (index absent), sans lien avec le changement testé.
