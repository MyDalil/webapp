# Décisions — Socle

Format : `- AAAA-MM-JJ — décision — raison`.

- 2026-10-06 — base Neon `dalil-db` via l’intégration Vercel, variable `DALIL_DATABASE_URL` prioritaire — séparation complète d’avec TableNow.
- 2026-10-06 — pas de `import 'server-only'` dans `mail.ts` — bloquait `payload migrate:create`.
- 2026-10-06 — hooks Users : remettre à zéro les drapeaux de `context` avant d’agir — l’invitation relançait le hook en boucle.
- 2026-10-06 — un seul site, découpé en modules métier avec portes et frontières vérifiées — indépendance sans multiplier les déploiements.
- 2026-10-17 — en-tête : « Guide & Services », six rubriques (Découvrir, Vivre en Algérie, Démarches, Services, Vie musulmane, Plus) avec méga-menus (`shell/nav.ts`), barre « Trouvez rapidement », sélecteur de wilaya facultatif (appareil + compte, `shell/wilaya.ts`) ; menu mobile sous 1 100 px ; valeurs musulmanes comme ligne directrice du site — décisions de Rad.
