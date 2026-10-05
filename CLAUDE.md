# DALIL — webapp

Guide de l’Algérie. Visuel = maquette DALIL validée par Rad (zip du 5 octobre 2026). Contenu = tout le prototype ChatGPT (dalil-algerie-public.vercel.app).
Stack : Next.js 16 + Payload CMS 3 + Neon Postgres, déployé sur Vercel, domaine mydalil.com.

## Règle n°1 — ne pas inventer de design
Le visuel vient de la maquette (`src/styles/mockup.css`), les textes et fonctions du prototype (`src/content/`).
**Aucune création visuelle maison sans demande explicite de Rad.** Améliorer = rendre fonctionnel/responsive, pas restyler.

## Architecture
- `src/styles/` : `legacy.css` (CSS du prototype, scopé `.legacy`, généré par `scripts/scope-legacy-css.mjs`) → `mockup.css` (maquette, prioritaire) → `site.css` (raccords).
- `src/content/` : contenu extrait du prototype (`scripts/extract-*.{py,mjs}` depuis `legacy/`) — `pages/*.json` (arbres rendus par `components/Tree.tsx`), `catalog.ts` (secteurs, guides, wilayas), `listings.json` (adresses).
- `src/app/(site)/` : pages dédiées au format maquette (`/`, `/annuaire`, `/adresses/[slug]`, `/label`, `/proposer`, `/installation`, `/espace`, `/recherche`) ; tout le reste passe par `[...slug]` (contenu du prototype dans la coque de la maquette). Ajouter une page dédiée → l’ajouter à `DEDICATED` dans `[...slug]/page.tsx`.
- `src/components/islands/` : ports client des composants interactifs du prototype (formulaires, recherche guidée, diagnostic, profil test…).
- `src/app/api/*` : routes du prototype réimplémentées sur Neon. Session visiteur = cookie `dalil_sid` → collection `visitor-sessions`.
- `/admin` — Payload : Demandes reçues, Newsletter, Sessions visiteurs, Équipe. Le premier compte créé devient administrateur.

## Limites connues
- Carte de l’annuaire indicative (pas encore de coordonnées vérifiées).
- Pièces jointes des contributions : seuls nom/taille/type sont enregistrés.
- `/ar` et `/en` : pages d’attente reprises du prototype.

## Skills du repo (`.claude/skills/`)
ui-ux-pro-max, design-system, ui-styling, superpowers (`sp-*`), Matt Pocock (`mp-*`), payload.

## Branches et mise en ligne
- `main` = production (www.mydalil.com, base Neon `production`). **Jamais de push direct sur `main`.**
- `preview` = test (preview.mydalil.com, protégé par la connexion Vercel, base Neon `preview` séparée).
- Circuit : travail sur `preview` → Rad teste sur preview.mydalil.com → feu vert explicite de Rad → merge `preview` → `main`.

## Commandes
- `pnpm dev` / `pnpm build` (Postgres dans `.env`).
- Après modification de schéma : `pnpm payload migrate:create <nom>` puis commit. Migrations appliquées au build Vercel (`vercel-build`) et au démarrage (`prodMigrations`).
