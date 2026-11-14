# Décisions — Pilotage

Format : `- AAAA-MM-JJ — décision — raison`. Ne jamais réécrire une entrée : en ajouter une nouvelle qui la remplace.

- 2026-10-06 — module créé lors de la réorganisation par métiers — chaque métier évolue indépendamment avec sa mémoire.
- 2026-11-14 — cockpit /admin (lot 1) : menu, barre ⌘K, accueil Pilotage remplacent l’habillage Payload par ses points d’extension officiels (`Nav`, `actions`, `views.dashboard`, `graphics`) ; les écrans natifs restent, habillés par les mêmes jetons — mises à jour de Payload sans réécriture.
- 2026-11-14 — menu par rôle : un conseiller ne voit que l’accompagnement, même si d’autres collections sont lisibles en public — règle de `src/platform/access.ts`.
- 2026-11-14 — l’admin s’ouvre en français tant qu’aucune langue n’est choisie (`src/proxy.ts`, limité à /admin) — Payload suivait la langue du navigateur (anglais).
- 2026-11-14 — menu ouvert par défaut au-dessus de 1024 px — Payload le fermait sur tout écran ≤ 1440 px, donc sur la plupart des ordinateurs.
- 2026-11-14 — erreur à ne pas refaire : lancer les e2e sans `pnpm search:index` fait échouer la « Recherche complète » (index absent), sans lien avec le changement testé.
- 2026-11-14 — écrans du cockpit (lot 5) : vues Payload `views.<clé> { path: '/cockpit/…' }` enveloppées par `CockpitPage` (gabarit Payload + connexion + rôle) — Payload n’applique ni gabarit ni contrôle d’accès aux vues à deux segments.
- 2026-11-14 — `VIEW_ROLES` (admin/data.ts) décide qui voit un écran ; hors rôle, le menu retombe sur la liste Payload — un éditeur ne doit pas voir un lien qui lui répond « accès réservé ».
- 2026-11-14 — Validation clôt ou annule la tâche ; la proposition n’est jamais appliquée automatiquement — un agent propose, l’équipe publie (règle « Saïd a le dernier mot »).
- 2026-11-14 — Connecteurs affiche la présence des clés, jamais leur valeur ; le test e2e le vérifie — règle racine 7.
- 2026-11-14 — erreur à ne pas refaire : nouvelle vue ou nouveau composant Payload sans `pnpm generate:importmap` → page vide (« PayloadComponent not found in importMap »). Régénérer et commiter `src/app/(payload)/admin/importMap.js`.
- 2026-11-14 — erreur à ne pas refaire : `.vercelignore` exclut `*.md` ; tout dossier de `.md` lu à l’exécution (ex. `company/`) doit y être réautorisé (`!company/**/*.md`), sinon le déploiement Vercel échoue alors que la CI passe.
- 2026-11-14 — Médiathèque (lot 6) : `/admin/cockpit/medias` remplace la liste Payload dans le menu ; la vue tableau reste accessible. Remplacer partout et supprimer : administrateur ou patron ; supprimer seulement une photo utilisée nulle part.
- 2026-11-14 — Historique et corbeille (lot 7) : `/admin/cockpit/historique` — recherche, aperçu FR/AR/EN (route `/api/preview`, paramètre `lang`), propositions d’agents, journal d’audit avec `act_…`, versions. Restaurer une version crée un brouillon : la version publiée reste en ligne, la publication reste une décision d’administrateur.
- 2026-11-14 — erreur à ne pas refaire : chercher avec `draft: true` ignore les adresses importées (elles n’ont pas de version). Chercher sur la fiche principale.
- 2026-11-14 — Boîte unique (lot 8) : `/admin/cockpit/boite`. Contributions et candidatures se traitent dans leur fiche (leur changement de statut envoie déjà un email) ; les autres types se traitent ici.
- 2026-11-14 — erreur à ne pas refaire : un test e2e qui crée une tâche d’agent doit l’annuler ; sinon elle occupe la file et fait échouer le test du moteur. Deux fichiers qui créent le même compte de test doivent tolérer la course.
- 2026-11-14 — Communauté (lot 9) : écrans Modération (files à contrôler, avis récents à masquer), Annonces (triées par score anti-arnaque, publier ou refuser avec motif), Professionnels (pièces, vérifications ; publication par un administrateur, conditions vérifiées par le serveur), Membres (recherche, compte confirmé, annonces). Aucune suspension de membre : le champ n’existe pas, à décider.
