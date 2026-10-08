# Décisions — Annuaire & Lieux

Format : `- AAAA-MM-JJ — décision — raison`. Ne jamais réécrire une entrée : en ajouter une nouvelle qui la remplace.

- 2026-10-06 — module créé lors de la réorganisation par métiers — chaque métier évolue indépendamment avec sa mémoire.
- 2026-10-06 — le champ de statut s’appelle `verification`, pas `status` — `status` entrait en collision avec l’enum `_status` des brouillons Payload.
- 2026-10-06 — seule `verifiedAt` est affichée comme date sur une fiche — la date de mise à jour technique (seed) trompait le visiteur.
- 2026-10-06 — fichier de requêtes renommé `queries.ts` — `places.ts` et `Places.ts` entraient en conflit sur les systèmes insensibles à la casse (macOS).
- 2026-10-08 — annuaire pré-rempli depuis Wikidata/Commons (aucune copie de Tripadvisor ni de photos sans licence) ; publication seulement avec photo libre + texte DALIL ; textes rédigés à partir des faits, Wikipédia gardé en note interne — demande de Rad, cadre légal validé.
- 2026-10-08 — photos Commons affichées depuis upload.wikimedia.org avec crédit (pas de copie dans Vercel Blob) — préserve le quota et garde l’attribution à jour.
- 2026-10-08 — tri par `score` descendant ; toute fiche reçoit un score à l’enregistrement (sinon les NULL passent en tête en Postgres).
