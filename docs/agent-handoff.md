# Reprise — 12 novembre 2026

## Mise à jour — 14 novembre 2026

- `MyDalil/webapp` reste inchangé comme dépôt canonique et reste sur GitHub Free.
- La règle racine impose désormais une branche dédiée à chaque agent, une pull request vers `preview` et aucune écriture directe sur `preview` ou `main`.
- Aucun code produit, secret, service cloud ni déploiement n'est modifié par ce lot.

- Chantier : rangement du dépôt et continuité entre outils de développement.
- Référence applicative avant ce changement documentaire : `preview`, `f9f538db902d9f8cdcabec247fa36b6cae9cdb60`.
- Documentation de travail : `AGENTS.md`, instructions et journaux des modules concernés.
- Ce lot modifie uniquement la documentation ; aucun skill ni réglage de permissions n’est ajouté.
- Relire les contrôles et les déploiements sur la révision courante avant toute livraison.
- Prochaine action : vérifier la branche, le diff et la dernière décision du module avant de poursuivre la tâche confiée.
- Aucun changement applicatif, migration ou lancement n’est attesté par ce rangement.

## Cockpit /admin — 14 novembre 2026 (lots 1 à 5)

- Branches empilées, chacune avec sa PR vers `preview` : lot 1 `agent/cockpit-lot1` (#19), lot 2 `agent/cockpit-lot2` (#20), lot 3 `agent/cockpit-lot3` (#21), lot 4 `agent/cockpit-lot4` (#22), lot 5 `agent/cockpit-lot5`. Aucune fusion faite : feu vert de Rad requis.
- Déploiements Vercel Preview des lots 3 et 4 : réussis après le correctif `.vercelignore` (`!company/**/*.md`).
- Lot 5 (écrans des agents) : `/admin/cockpit/{agents,taches,validation,activite,conversations,memoire,connecteurs}` dans `src/modules/pilotage/admin/views/`, enregistrés dans `payload.config.ts`, rôles dans `admin/data.ts` (`VIEW_ROLES`), textes FR/AR/EN dans `admin/i18n.ts`.
- Vérifié en local sur le lot 5 : `pnpm check` OK, `pnpm lint` 0 erreur, `pnpm test` 163 réussis, `pnpm build` OK, e2e complets 139 réussis (`TELEGRAM_WEBHOOK_SECRET=ci-telegram-secret DALIL_TEST_LLM=1`, après `pnpm search:index`).
- Non vérifié : parcours réel sur preview.mydalil.com (protégé par la connexion Vercel).
- À fournir par Rad dans Vercel : clés ANTHROPIC/OPENAI, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` ; dans /admin : budget mensuel des agents, `telegramId` des comptes, `telegramChannelId`.
- Lot 5 : CI entièrement verte et déploiement Vercel Preview réussi (PR #23).
- Lot 6 `agent/cockpit-lot6` (Médiathèque) : glisser-déposer, 4 formats WebP (`sharp` ajouté), point focal (recadrage vérifié), descriptions FR/AR/EN, doublons par SHA-256, utilisation et remplacement partout, migration `20261114_150104_cockpit_mediatheque` (ajout de colonnes seulement).
- Vérifié en local sur le lot 6 : `pnpm check` OK, lint 0 erreur, `pnpm test` 171 réussis, build OK, e2e complets 151 réussis.
- Non vérifié : recadrage du point focal avec Vercel Blob (vérifié sur disque local seulement) ; les descriptions AR/EN ne sont pas encore lues par le site public (lot 10, Traductions).
- Prochaine action : lot 7, Édition de fiche (aperçu FR/AR/EN, historique, restauration). Feuille de route : `docs/superpowers/plans/2026-11-14-cockpit-admin-feuille-de-route.md`.
