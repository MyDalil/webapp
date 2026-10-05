# DALIL — webapp

Guide de l’Algérie. Site public = copie 1:1 du prototype validé par Rad (construit sur ChatGPT), désormais hébergé chez nous.
Back-end : Next.js 16 + Payload CMS 3 + Neon Postgres, déployé sur Vercel.

## Règle n°1 — ne pas toucher au visuel
Le design, les textes et la structure du site public sont ceux validés par Rad. **Aucune modification visuelle sans demande explicite.**

## Architecture
- `public/` — le site public tel quel : `public/<chemin>/index.html` + flux de navigation `public/<chemin>.rsc` + `public/assets/*` + `public/images/*`.
  - `next.config.ts` réécrit `/chemin` → `/chemin/index.html` et sert les `.rsc` en `text/x-component` (navigation client du prototype).
- `src/app/api/*` — réimplémentation sur Neon des routes du prototype :
  `subscribers` (newsletter), `contributions` (proposer), `applications` (pros), `contact-requests`, `diagnostics`,
  `test-session` (profil test 7 jours, favoris, avis), `favorites`, `collections` (listes), `checklist`, `me`.
  Session visiteur = cookie `dalil_sid` → collection `visitor-sessions`.
- `/admin` — Payload : Demandes reçues, Newsletter, Sessions visiteurs, Équipe. Le premier compte créé devient administrateur.

## Limites connues
- `/recherche?q=…` : la page est servie dans sa version de base (le calcul côté serveur du prototype n’est pas récupérable sans son code source).
- Pièces jointes des contributions : seuls nom/taille/type sont enregistrés.
- `/api/admin/*` (admin annuaire + synchro Notion du prototype) : remplacés par `/admin`.

## Skills du repo (`.claude/skills/`)
ui-ux-pro-max, design-system, ui-styling, superpowers (`sp-*`), Matt Pocock (`mp-*`), payload.

## Commandes
- `pnpm dev` / `pnpm build` (Postgres dans `.env`).
- Après modification de schéma : `pnpm payload migrate:create <nom>` puis commit. Migrations appliquées au build Vercel (`vercel-build`) et au démarrage (`prodMigrations`).
- Ne jamais pousser, déployer ou toucher la base de production sans accord explicite de Rad ou Saïd.
