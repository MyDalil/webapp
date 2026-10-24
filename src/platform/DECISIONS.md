# Décisions — Socle

Format : `- AAAA-MM-JJ — décision — raison`.

- 2026-10-06 — base Neon `dalil-db` via l’intégration Vercel, variable `DALIL_DATABASE_URL` prioritaire — séparation complète d’avec TableNow.
- 2026-10-06 — pas de `import 'server-only'` dans `mail.ts` — bloquait `payload migrate:create`.
- 2026-10-06 — hooks Users : remettre à zéro les drapeaux de `context` avant d’agir — l’invitation relançait le hook en boucle.
- 2026-10-06 — un seul site, découpé en modules métier avec portes et frontières vérifiées — indépendance sans multiplier les déploiements.
- 2026-10-17 — en-tête : « Guide & Services », six rubriques (Découvrir, Vivre en Algérie, Démarches, Services, Vie musulmane, Plus) avec méga-menus (`shell/nav.ts`), barre « Trouvez rapidement », sélecteur de wilaya facultatif (appareil + compte, `shell/wilaya.ts`) ; menu mobile sous 1 100 px ; valeurs musulmanes comme ligne directrice du site — décisions de Rad.
- 2026-10-17 — rôle `patron` (Saïd) au-dessus d’admin ; seul un patron donne ou retire ce rôle, sauf s’il n’en existe aucun — décision de Rad (Saïd est le patron).
- 2026-10-17 — journal d’audit en ajout seul, garanti par un déclencheur Postgres — un journal modifiable ne prouve rien.
- 2026-10-17 — arrêt général à 3 niveaux (finir puis arrêter, arrêter maintenant, tout couper) dans le global `controls` — recommandations de gouvernance des agents.
- 2026-10-22 — migrations de données différées (`deferredData.ts`, `pnpm migrate:data` après `payload migrate`) — sur une base vide, `seed_places` échouait (colonne `name_ar` absente : elle arrive plus tard) ; la production, encore au schéma du 5 octobre, aurait échoué de la même façon à la fusion. Les 7 migrations de données existantes sont enveloppées ; sur preview (déjà migrée) elles ne sont pas rejouées. Exception assumée à « migrations jamais modifiées » : seul le moment d’exécution change, pas le contenu.
- 2026-10-22 — CI obligatoire avant fusion : base neuve migrée depuis zéro, build, parcours Playwright ordinateur + mobile ; contrôle en lecture seule après chaque déploiement Vercel — une fusion vers `main` ne repose plus sur un test manuel seul.
- 2026-10-22 — premier compte /admin en ligne : uniquement avec l’email `DALIL_ADMIN_EMAIL` — une base vide ne donne plus l’administration au premier venu.
- 2026-10-23 — anti-robot sans service tiers : limite de débit sur toutes les routes publiques d’écriture (la newsletter permettait d’envoyer des emails de confirmation en masse vers n’importe quelle adresse) + preuve de travail invisible sur les formulaires anonymes — pas de compte Turnstile à gérer, rien de visible ajouté à la maquette.
- 2026-10-23 — lint : configuration native Next 16 (`@eslint/eslintrc` absent cassait `pnpm lint`), dans la CI ; `react-hooks/set-state-in-effect` en avertissement (lecture du navigateur après hydratation, voulue).
- 2026-10-23 — suivi des erreurs dans Neon (`error-logs`) avec alerte email, au lieu de Sentry — aucun compte tiers, données dans l’infrastructure existante, consultation dans /admin ; testé de bout en bout (Playwright + base).
- 2026-10-24 — sauvegardes quotidiennes chiffrées vers Vercel Blob (store public : fichiers chiffrés, chemins aléatoires) + restauration scriptée, testée à chaque CI — une sauvegarde jamais restaurée ne compte pas ; aucun nouveau compte.
