# DALIL — webapp

Guide de l’Algérie. Visuel = maquette DALIL validée par Rad (zip du 5 octobre 2026). Contenu = tout le prototype ChatGPT (dalil-algerie-public.vercel.app).
Stack : Next.js 16 + Payload CMS 3 + Neon Postgres (intégration Vercel, variable `DALIL_DATABASE_URL`, une branche Neon par preview), déployé sur Vercel, domaine mydalil.com.

## Règle n°1 — ne pas inventer de design
Le visuel vient de la maquette (`src/styles/mockup.css`), les textes et fonctions du prototype (`src/content/`).
**Aucune création visuelle maison sans demande explicite de Rad.** Améliorer = rendre fonctionnel/responsive, pas restyler.

## Architecture
- `src/styles/` : `legacy.css` (CSS du prototype, scopé `.legacy`, généré par `scripts/scope-legacy-css.mjs`) → `mockup.css` (maquette, prioritaire) → `site.css` (raccords).
- `src/content/` : contenu extrait du prototype (`scripts/extract-*.{py,mjs}` depuis `legacy/`) — `pages/*.json` (arbres rendus par `components/Tree.tsx`), `catalog.ts` (secteurs, guides, wilayas), `listings.json` (adresses).
- `src/app/(site)/` : pages dédiées au format maquette (`/`, `/annuaire`, `/adresses/[slug]`, `/label`, `/proposer`, `/installation`, `/espace`, `/recherche`) ; tout le reste passe par `[...slug]` (contenu du prototype dans la coque de la maquette). Ajouter une page dédiée → l’ajouter à `DEDICATED` dans `[...slug]/page.tsx`.
- `src/components/islands/` : ports client des composants interactifs du prototype (formulaires, recherche guidée, diagnostic, profil test…).
- `src/app/api/*` : routes du prototype réimplémentées sur Neon. Session visiteur = cookie `dalil_sid` → collection `visitor-sessions`.
- `/admin` — Payload : **Annuaire** (Adresses, Photos sur Vercel Blob `dalil-photos`), Boîte de réception (Demandes, Newsletter, Sessions visiteurs), Équipe. Le premier compte créé devient administrateur.
- Annuaire : collection `places` (`src/collections/Places.ts`) → `src/lib/places.ts` → `/annuaire`, `/annuaire/[secteur]`, `/adresses/[slug]`. Pages rafraîchies à chaque enregistrement (`revalidatePath`). Brouillons visibles via le bouton Aperçu (`/api/preview`). Carte : Leaflet + fonds CARTO/OpenStreetMap ; sans coordonnées, position approximative au centre de la ville.

## Emails (Resend, `src/lib/mail.ts`)
Expéditeur `DALIL <salam@mydalil.com>` (domaine vérifié chez Resend, intégration Vercel → `RESEND_API_KEY`) ; salam@ est redirigée par Gandi vers la boîte de l’équipe.
- Newsletter : confirmation (double opt-in) → bienvenue ; désinscription en un clic (en-têtes RFC 8058) ; envois depuis /admin « Envois newsletter » (test, puis envoi unique aux confirmés).
- Contributions et candidatures : alerte équipe + accusé de réception ; emails de suivi à chaque changement de statut (`src/lib/notify.ts`), avec « Message au demandeur ».
- Équipe /admin : invitation (choix du mot de passe), mot de passe oublié, alerte mot de passe modifié, alerte changement d’email.
- À venir avec les comptes membres publics : vérification d’email, bienvenue, mot de passe oublié, suppression/export des données.

## Limites connues
- Les 10 adresses reprises du prototype n’ont pas encore de coordonnées GPS ni de photos propres (à saisir dans /admin).
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
