# DALIL — webapp

Guide de l’Algérie (FR / EN / AR). Next.js 16 + Payload CMS 3 + Neon Postgres, déployé sur Vercel.

## Règles
- **Neon est la source de vérité.** Tout contenu passe par Payload (`/admin`). Pas de Notion, pas de contenu en dur.
- **Rien ne sort sans validation humaine.** Les agents / rédacteurs créent des brouillons ; un administrateur publie.
- Toute information publiée est **datée et sourcée**. Une donnée inconnue n’est jamais présentée comme acquise.
- Présence dans l’annuaire ≠ label. Le label ne s’achète pas.
- Ne jamais pousser, déployer ou modifier la base de production sans accord explicite de Rad ou Saïd.

## Skills du repo (`.claude/skills/`)
- Design : `ui-ux-pro-max` (lancer `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<requête>" --domain <ux|typography|color…>`), `design-system`, `ui-styling`.
- Méthode : `sp-brainstorming`, `sp-writing-plans`, `sp-executing-plans`, `sp-test-driven-development`, `sp-systematic-debugging`, `sp-verification-before-completion`, revues de code.
- Ingénierie (Matt Pocock) : `mp-domain-modeling`, `mp-codebase-design`, `mp-to-spec`, `mp-tdd`, `mp-code-review`, `mp-improve-codebase-architecture`, `mp-diagnosing-bugs`, `mp-grill-me`.
- Payload : `payload` (référence complète du CMS).

## Architecture
- `src/collections/` — modèle de données (fiches, secteurs, spécialités, wilayas, guides, actualités, pages, médias, demandes, newsletter, équipe).
- `src/lib/data.ts` — toutes les lectures publiques (uniquement contenus publiés, `locale: 'all'` + repli FR signalé).
- `src/lib/revalidate.ts` — purge du cache à chaque publication (pas de reconstruction quotidienne).
- `src/app/(frontend)/[locale]/` — site public. Français sans préfixe (`/annuaire`), `/en/…`, `/ar/…` (RTL).
- `src/seed/` — données initiales idempotentes (`pnpm seed`).
- Design tokens : `src/app/(frontend)/globals.css` (papier chaulé, bleu Méditerranée, terre cuite ; motif khatam).

## Commandes
- `pnpm dev` — local (Postgres local dans `.env`).
- `pnpm payload migrate:create <nom>` après toute modification de schéma, puis commit de la migration.
- Les migrations s’appliquent automatiquement au démarrage en production (`prodMigrations`).
- `pnpm seed` — réinjecte la structure de base sans écraser les fiches.

This project uses the Payload CMS skill at `.claude/skills/payload/`.
