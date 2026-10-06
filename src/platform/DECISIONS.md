# Décisions — Socle

Format : `- AAAA-MM-JJ — décision — raison`.

- 2026-10-06 — base Neon `dalil-db` via l’intégration Vercel, variable `DALIL_DATABASE_URL` prioritaire — séparation complète d’avec TableNow.
- 2026-10-06 — pas de `import 'server-only'` dans `mail.ts` — bloquait `payload migrate:create`.
- 2026-10-06 — hooks Users : remettre à zéro les drapeaux de `context` avant d’agir — l’invitation relançait le hook en boucle.
- 2026-10-06 — un seul site, découpé en modules métier avec portes et frontières vérifiées — indépendance sans multiplier les déploiements.
