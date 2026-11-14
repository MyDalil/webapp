# DALIL — règles communes à tous les agents

Ce fichier est la mémoire racine du projet. Il est écrit pour **n’importe quel agent IA** (Claude, ChatGPT/Codex, Cursor, Gemini, Copilot…) comme pour un humain. `CLAUDE.md` ne fait que l’importer.

DALIL (mydalil.com) : le guide de confiance de l’Algérie — comprendre, découvrir, s’installer, vivre, entreprendre, trouver les bons interlocuteurs.
Stack : Next.js 16 + Payload CMS 3 + Neon Postgres + Vercel (Blob pour les photos) + Resend (emails depuis salam@mydalil.com). Domaine chez Gandi.

## Règles absolues
1. **Pas de design inventé.** Visuel = maquette validée (`src/styles/mockup.css`), contenus et fonctions = prototype (`src/modules/contenus/`). Améliorer = rendre fonctionnel/responsive, jamais restyler sans demande explicite de Rad.
2. **Branche dédiée obligatoire.** Avant toute modification, chaque agent crée et active une branche dédiée depuis `preview`, puis vérifie avec `git branch --show-current` que la branche courante n'est ni `main`, ni `preview`, ni une autre branche partagée. Commits et pushs vont uniquement sur la branche dédiée → pull request vers `preview` → test sur preview.mydalil.com → feu vert explicite → promotion vers `main`. L'absence de protection GitHub payante n'autorise jamais une écriture directe sur une branche partagée.
3. **Ne jamais inventer une information.** Une donnée sans source ni date de vérification s’affiche comme « à vérifier ».
4. **La vérification est indépendante des revenus.** Le module `pros` (abonnements) ne peut ni attribuer ni modifier un statut ou un label du module `confiance`.
5. **Les données vivent dans Neon, pas dans la mémoire des agents.** Les fichiers `AGENTS.md`/`DECISIONS.md` contiennent des règles et des décisions, jamais des fiches, horaires ou statuts.
6. **Aucune opération destructive en production** sans vérification préalable et possibilité de restauration.
7. Secrets uniquement dans les variables Vercel, jamais dans le code ni dans ces fichiers.
8. **Finesse visuelle (règle permanente de Rad).** Le site doit paraître fin, classe, aux bonnes proportions : tout aligné sur une grille, cases petites et élégantes, pictogrammes en couleur, une seule barre de recherche visible à la fois. Toute modification d’interface applique le skill `ui-ux-pro-max` (liste de contrôle avant livraison) et se vérifie à 375 px et à 1440 px.

## Organisation : un module par métier
```
src/
  app/              routage Next.js uniquement (pages publiques sous (site)/[lang] : fr à la racine, /en, /ar ; /api, /admin) — fin, il appelle les modules
  platform/         socle partagé, ne dépend d’aucun métier
    access.ts         rôles et droits (patron, admin, editor, conseiller) ; agents IA à part ; un compte public n’est jamais staff
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
  rubriques/        mémoire et garde-fous par rubrique du menu et par catégorie (AGENTS.md, DECISIONS.md, SOURCES.md) — voir src/rubriques/AGENTS.md
  styles/           legacy.css (prototype, scopé .legacy) → mockup.css (maquette, prioritaire) → site.css (raccords)
  migrations/       historique du schéma, jamais modifié après coup
```
Métiers : `annuaire`, `confiance`, `contenus`, `communaute`, `membres`, `pros`, `sante`, `services`, `annonces`, `messages`, `communication`, `recherche`, `pilotage`, `accompagnement` (packs payants d’aide aux démarches), `agents` (équipe IA).

**Frontières (vérifiées automatiquement à chaque build par `scripts/check-boundaries.mjs`) :**
- hors d’un module, on n’y entre que par `@/modules/<m>`, `@/modules/<m>/ui` ou `@/modules/<m>/collections` ;
- à l’intérieur d’un module, chemins relatifs ;
- `src/platform` n’importe jamais un module.
Les métiers communiquent par leurs portes et par les hooks Payload (événements : création, changement de statut, publication).

## Avant de travailler
1. Identifier le module propriétaire de la demande, lire son `AGENTS.md` et son `DECISIONS.md`.
   Pour un contenu (fiche, démarche, page de rubrique) : lire aussi `src/rubriques/<rubrique>/<catégorie>/AGENTS.md`.
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
- Discipline GitHub Free : avant toute fusion, relire manuellement les statuts « Frontières, types et tests unitaires » et « Build et parcours essentiels » ; la promotion vers `main` exige aussi « Vercel », « Parcours sur le déploiement » et le feu vert de Rad. Les agents ouvrent une pull request et ne fusionnent pas leur propre travail sans validation explicite.
- Un parcours essentiel nouveau (page, formulaire, paiement…) = un test dans `e2e/`. Un test qui écrit en base porte `@ecriture` dans son titre.

## Surveillance
- `.github/workflows/surveillance.yml` (depuis `main`, toutes les heures) : accueil, `/api/sante` (application + base, JSON validé), plan du site ; panne confirmée → issue « Site indisponible » (email GitHub), fermée au retour ; sauvegarde de plus de 36 h → issue « Tâche quotidienne en retard ».
- Tâche quotidienne : /admin › Pilotage › Tâches planifiées (état, durée, volume, erreur de chaque tâche). Emails : /admin › Pilotage › Emails envoyés.
- Erreurs serveur : /admin › Pilotage › Erreurs du site, alerte email à la première occurrence et quand une erreur résolue revient.

## Migrations de données
- Une migration qui écrit des données (`payload.create`, `importPlaces`…) enveloppe son `up` dans `deferred('<nom>', …)` (`src/platform/deferredData.ts`).
- Raison : elle écrit avec le schéma d’aujourd’hui ; sur une base qui rattrape plusieurs migrations (production à la fusion, base neuve, CI), elle tournerait avant les colonnes ajoutées ensuite. Elle est notée pendant `payload migrate`, puis exécutée par `pnpm migrate:data` quand tout le schéma est en place.

## Langues
- Pages publiques sous `src/app/(site)/[lang]/` : `/x` est réécrit en `/fr/x` (`next.config.ts`, sans fonction), `/fr/x` redirige vers `/x`, l’anglais et l’arabe sont servis sous `/en/x` et `/ar/x`.
- Liens : `@/platform/ui/Link` (jamais `next/link` directement) et `useLangRouter()` gardent la langue ; `usePath()` donne le chemin sans préfixe ; `useLang()` la langue (fixée par le serveur).
- Rafraîchir une page publiée : `revalidateLangs(chemin)` (les trois langues).
- Arabe : `dir="rtl"` posé par la mise en page ; noms, adresses et horaires jamais traduits.

## Référencement
- `/sitemap.xml` (index) → `/sitemaps/pages.xml`, `professionnels.xml`, `annonces.xml`, `adresses-N.xml` : calculé à la lecture (cache 1 h), contenus publiés seulement (`src/modules/recherche/sitemap.ts`).
- `/robots.txt` : tout bloqué hors production ; en production, espaces privés et outils exclus.
- Une page privée ou de compte : `robots: { index: false }` dans sa page **et** son chemin dans `ROBOTS_DISALLOW`.

## Commandes
- `pnpm dev` / `pnpm build` (Postgres dans `.env`), `pnpm check` (frontières + types), `pnpm test` (Vitest), `pnpm test:e2e` (Playwright, après `pnpm build`).
- Base neuve : `pnpm payload migrate && pnpm migrate:data`.
- Schéma modifié → `pnpm payload migrate:create <nom>` puis commit ; migrations appliquées au build Vercel (`vercel-build`) et au démarrage (`prodMigrations`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Autonomie et continuité

Radwan autorise les opérations courantes nécessaires à la tâche confiée : diagnostic, modifications de code et de documentation, tests, création de branches et de commits, demandes de fusion et déploiements Preview dans les ressources existantes du projet. Ne pas redemander une autorisation déjà donnée pour ce même périmètre. Aller jusqu'à un résultat vérifié ; en cas d'échec, diagnostiquer et corriger sa cause.

Cette autorisation concerne le travail de développement. Elle ne modifie ni les droits des utilisateurs de l'application, ni ses délégations métier. Elle ne remplace pas une authentification imposée par GitHub ou l'outil utilisé. Aucun abonnement, exposition du code privé, accès d'un nouveau tiers, suppression irréversible ou migration destructive n'est autorisé implicitement. Respecter le circuit de production propre au dépôt et les validations produit déjà définies.

Avant de travailler :
1. Vérifier le dépôt, la branche et `git status --short` ; préserver tout travail présent.
2. Lire ce fichier, les consignes de la zone touchée et le dernier point de reprise ; ne pas reprendre un audit complet sans changement qui le justifie.
3. Travailler dans une branche courte ou un worktree isolé ; ne jamais forcer une branche partagée ni supprimer les commits d'un autre intervenant.
4. Exécuter les vérifications adaptées au changement. Corriger un contrôle en échec, sans désactiver la protection ni le présenter comme réussi.
5. Après fusion, supprimer seulement sa branche intégrée ; conserver les branches de livraison et les travaux non fusionnés.

À chaque interruption ou livraison, actualiser `docs/agent-handoff.md` et les journaux des modules concernés : tâche et périmètre, branche et SHA vérifiés, changements, commandes exécutées et résultats réels, prochaine action concrète, blocages précis. Ne jamais y recopier de secret, de jeton ou de données client. Distinguer code écrit, tests exécutés, version déployée et parcours réellement vérifié.


## Reprise du travail

Point de reprise : `docs/agent-handoff.md`.
Conserver les skills et les consignes métier déjà présents dans `.agents/skills/`.
Les autorisations techniques de développement ne modifient pas les approbations métier ou les validations produit.
