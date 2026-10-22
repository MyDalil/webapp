# DALIL — règles communes à tous les agents

Ce fichier est la mémoire racine du projet. Il est écrit pour **n’importe quel agent IA** (Claude, ChatGPT/Codex, Cursor, Gemini, Copilot…) comme pour un humain. `CLAUDE.md` ne fait que l’importer.

DALIL (mydalil.com) : le guide de confiance de l’Algérie — comprendre, découvrir, s’installer, vivre, entreprendre, trouver les bons interlocuteurs.
Stack : Next.js 16 + Payload CMS 3 + Neon Postgres + Vercel (Blob pour les photos) + Resend (emails depuis salam@mydalil.com). Domaine chez Gandi.

## Règles absolues
1. **Pas de design inventé.** Visuel = maquette validée (`src/styles/mockup.css`), contenus et fonctions = prototype (`src/modules/contenus/`). Améliorer = rendre fonctionnel/responsive, jamais restyler sans demande explicite de Rad.
2. **Jamais de push direct sur `main`.** Travail sur `preview` → Rad teste sur preview.mydalil.com → feu vert explicite → merge `preview` → `main`.
3. **Ne jamais inventer une information.** Une donnée sans source ni date de vérification s’affiche comme « à vérifier ».
4. **La vérification est indépendante des revenus.** Le module `pros` (abonnements) ne peut ni attribuer ni modifier un statut ou un label du module `confiance`.
5. **Les données vivent dans Neon, pas dans la mémoire des agents.** Les fichiers `AGENTS.md`/`DECISIONS.md` contiennent des règles et des décisions, jamais des fiches, horaires ou statuts.
6. **Aucune opération destructive en production** sans vérification préalable et possibilité de restauration.
7. Secrets uniquement dans les variables Vercel, jamais dans le code ni dans ces fichiers.

## Organisation : un module par métier
```
src/
  app/              routage Next.js uniquement (pages publiques, /api, /admin) — fin, il appelle les modules
  platform/         socle partagé, ne dépend d’aucun métier
    access.ts         rôles et droits (patron, admin, editor) ; agents IA à part ; un compte public n’est jamais staff
    audit/            journal d’audit en ajout seul (toutes collections)
    controls/         commandes : arrêt général, agents, Telegram, maintenance, budgets
    video.ts          visio des consultations (fournisseur à brancher)
    http.ts           réponses /api, validation, accès Payload
    mail.ts           emails Resend (gabarit, envoi, désinscription)
    auth/             comptes équipe /admin (Users)
    storage/          photos (Media, Vercel Blob)
    referentiel/      secteurs, catégories, critères, guides, 69 wilayas
    shell/ ui/        en-tête, connexion, notifications, icônes
  modules/<métier>/
    AGENTS.md         mémoire du métier : rôle, périmètre, règles
    DECISIONS.md      journal daté des décisions et erreurs à ne pas refaire
    CLAUDE.md         importe AGENTS.md (adaptateur Claude)
    skills/           savoir-faire du métier (format ouvert SKILL.md)
    index.ts          porte serveur
    ui.ts             porte des composants publics
    collections.ts    porte des données (schéma Payload)
  styles/           legacy.css (prototype, scopé .legacy) → mockup.css (maquette, prioritaire) → site.css (raccords)
  migrations/       historique du schéma, jamais modifié après coup
```
Métiers : `annuaire`, `confiance`, `contenus`, `communaute`, `membres`, `pros`, `sante`, `services`, `annonces`, `messages`, `communication`, `recherche`, `pilotage`, `agents` (équipe IA).

**Frontières (vérifiées automatiquement à chaque build par `scripts/check-boundaries.mjs`) :**
- hors d’un module, on n’y entre que par `@/modules/<m>`, `@/modules/<m>/ui` ou `@/modules/<m>/collections` ;
- à l’intérieur d’un module, chemins relatifs ;
- `src/platform` n’importe jamais un module.
Les métiers communiquent par leurs portes et par les hooks Payload (événements : création, changement de statut, publication).

## Avant de travailler
1. Identifier le module propriétaire de la demande, lire son `AGENTS.md` et son `DECISIONS.md`.
2. Lister les modules concernés et les dépendances à résoudre d’abord.
3. Après le travail : `pnpm check` (frontières + types), `pnpm test`, `pnpm build`, `pnpm test:e2e`, test sur preview.
4. Consigner toute décision durable dans le `DECISIONS.md` du module (date, décision, raison).

## Mémoire et apprentissage
- Chaque module apprend en enrichissant **son** `DECISIONS.md` et **ses** `skills/` au fil des chantiers.
- Une règle qui concerne plusieurs modules remonte dans ce fichier.
- Toute évolution de mémoire passe par un commit relu (preview), jamais modifiée silencieusement.

## Skills
- Format ouvert `SKILL.md` (dossier par skill, en-tête `name` + `description`).
- Skills transverses : `.agents/skills/` (ui-ux-pro-max, payload, revue de code, TDD…). `.claude/skills` pointe vers ce dossier.
- Skills métier : `src/modules/<m>/skills/<nom>/`, exposées dans `.agents/skills/<m>-<nom>` par lien symbolique.

## Accès aux services (MCP)
Déclarés une seule fois pour le projet : `.mcp.json` (Claude Code ; Codex/Cursor : même liste dans leur configuration). Serveurs officiels : Vercel, Neon, GitHub. Chaque agent n’utilise que ceux de son métier (moindre privilège) — voir la section « Accès » de chaque `AGENTS.md`.

## Infrastructure
- GitHub `MyDalil/webapp` : `main` → www.mydalil.com ; `preview` → preview.mydalil.com (protégé par la connexion Vercel).
- Vercel projet `mydalil` ; Neon `dalil-db` (Frankfurt), variable `DALIL_DATABASE_URL`, une branche Neon par preview.
- Vercel Blob `dalil-photos` (`BLOB_READ_WRITE_TOKEN`) ; Resend `RESEND_API_KEY` (domaine mydalil.com vérifié, eu-west-1).
- Gandi : DNS + redirection salam@mydalil.com vers la boîte de l’équipe.

## Contrôles avant fusion (CI)
- `.github/workflows/ci.yml`, à chaque PR vers `preview` ou `main` et à chaque push sur `preview` : frontières + types, tests unitaires, **base neuve** (Postgres + PostGIS) migrée depuis zéro, build complet, parcours essentiels Playwright (`e2e/`, ordinateur + mobile).
- `.github/workflows/deploiement.yml`, après chaque déploiement Vercel réussi : parcours en lecture seule (`--grep-invert @ecriture`) sur l’adresse déployée.
- Règles de branche GitHub : `preview` et `main` exigent les statuts « Frontières, types et tests unitaires », « Build et parcours essentiels » ; `main` exige en plus « Vercel » et « Parcours sur le déploiement ». Fusion `preview` → `main` seulement quand tout est vert **et** après le feu vert de Rad.
- Un parcours essentiel nouveau (page, formulaire, paiement…) = un test dans `e2e/`. Un test qui écrit en base porte `@ecriture` dans son titre.

## Migrations de données
- Une migration qui écrit des données (`payload.create`, `importPlaces`…) enveloppe son `up` dans `deferred('<nom>', …)` (`src/platform/deferredData.ts`).
- Raison : elle écrit avec le schéma d’aujourd’hui ; sur une base qui rattrape plusieurs migrations (production à la fusion, base neuve, CI), elle tournerait avant les colonnes ajoutées ensuite. Elle est notée pendant `payload migrate`, puis exécutée par `pnpm migrate:data` quand tout le schéma est en place.

## Référencement
- `/sitemap.xml` (index) → `/sitemaps/pages.xml`, `professionnels.xml`, `annonces.xml`, `adresses-N.xml` : calculé à la lecture (cache 1 h), contenus publiés seulement (`src/modules/recherche/sitemap.ts`).
- `/robots.txt` : tout bloqué hors production ; en production, espaces privés et outils exclus.
- Une page privée ou de compte : `robots: { index: false }` dans sa page **et** son chemin dans `ROBOTS_DISALLOW`.

## Commandes
- `pnpm dev` / `pnpm build` (Postgres dans `.env`), `pnpm check` (frontières + types), `pnpm test` (Vitest), `pnpm test:e2e` (Playwright, après `pnpm build`).
- Base neuve : `pnpm payload migrate && pnpm migrate:data`.
- Schéma modifié → `pnpm payload migrate:create <nom>` puis commit ; migrations appliquées au build Vercel (`vercel-build`) et au démarrage (`prodMigrations`).
