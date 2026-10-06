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
    access.ts         rôles et droits (admin, editor)
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
Métiers : `annuaire`, `confiance`, `contenus`, `communaute`, `membres`, `pros`, `messages`, `communication`, `recherche`, `pilotage`.

**Frontières (vérifiées automatiquement à chaque build par `scripts/check-boundaries.mjs`) :**
- hors d’un module, on n’y entre que par `@/modules/<m>`, `@/modules/<m>/ui` ou `@/modules/<m>/collections` ;
- à l’intérieur d’un module, chemins relatifs ;
- `src/platform` n’importe jamais un module.
Les métiers communiquent par leurs portes et par les hooks Payload (événements : création, changement de statut, publication).

## Avant de travailler
1. Identifier le module propriétaire de la demande, lire son `AGENTS.md` et son `DECISIONS.md`.
2. Lister les modules concernés et les dépendances à résoudre d’abord.
3. Après le travail : `pnpm check` (frontières + types), `pnpm build`, test sur preview.
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

## Commandes
- `pnpm dev` / `pnpm build` (Postgres dans `.env`), `pnpm check` (frontières + types).
- Schéma modifié → `pnpm payload migrate:create <nom>` puis commit ; migrations appliquées au build Vercel (`vercel-build`) et au démarrage (`prodMigrations`).
