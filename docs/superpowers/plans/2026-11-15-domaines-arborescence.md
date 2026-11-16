# Domaines et arborescence professionnelle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neutraliser les adresses Vercel publiques, unifier le domaine canonique et rendre toutes les routes explicites et vérifiables.

**Architecture:** Une origine unique alimente les métadonnées, emails, robots et sitemaps. Les redirections restent déclaratives dans Next.js ; un registre validé contre l'App Router documente toutes les pages sans dupliquer les écrans.

**Tech Stack:** Next.js 16.4, TypeScript 5.7, Vitest 4, Playwright 1.58, Vercel, GitHub.

**Spec:** `docs/superpowers/specs/2026-11-15-domaines-arborescence.md`

## Global Constraints

- Production canonique : `https://www.mydalil.com`.
- `mydalil.com` reste une redirection 308 ; Preview reste protégée et non indexée.
- Français sans préfixe ; anglais `/en` ; arabe `/ar`.
- Aucun écran dupliqué, changement visuel ou migration de données.
- Branche dédiée depuis `preview`, PR vers `preview`, feu vert avant production.

## Review Focus

- Le host `mydalil.vercel.app` conserve chemin et paramètres sans boucle.
- `/fr/**` et les alias linguistiques produisent une chaîne finie.
- Preview et les URL techniques restent non indexables et protégées.
- Toute nouvelle page dédiée non classée fait échouer le test.
- Les alias de compte restent absents du sitemap.

### Task 1: Origine canonique unique

- [x] Tester production, Preview, origine explicite et refus de `vercel.app`.
- [x] Créer `src/platform/site.ts` et remplacer les constantes dispersées.
- [x] Vérifier les assertions et committer.

### Task 2: Redirections de domaines et alias

- [x] Tester host Vercel, langues et alias de compte.
- [x] Créer `src/platform/routes.ts` et le consommer dans `next.config.ts`.
- [x] Ajouter le parcours Playwright et committer.

### Task 3: Registre complet

- [x] Tester le classement de tous les fichiers `page.tsx`.
- [x] Créer `src/platform/siteRoutes.ts` et centraliser les exclusions robots.
- [x] Documenter l'arborescence et les décisions durables.
- [x] Vérifier et committer.

### Task 4: Vérification et livraison Preview

- [ ] Exécuter frontières, types, tests, build et Playwright.
- [ ] Actualiser `docs/agent-handoff.md`.
- [ ] Pousser et ouvrir une PR vers `preview`.
- [ ] Vérifier le déploiement Preview.

### Task 5: Réglages Vercel et GitHub

- [x] Autoriser l'équipe Vercel `soualjawab1-6994`.
- [x] Neutraliser le projet historique et vérifier la protection Preview.
- [ ] Remplacer l'URL de présentation GitHub par `https://www.mydalil.com`.
- [ ] Vérifier statuts HTTP, `Location`, canoniques, robots et boucles.
