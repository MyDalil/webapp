# Reprise — 12 novembre 2026

## Mise à jour — 15 novembre 2026 : domaines et arborescence

- Branche `agent/domaines-arborescence`, créée depuis `preview`.
- Origine canonique unique : `https://www.mydalil.com`. Le domaine racine et l'alias technique principal redirigent en 308 vers `www` ; `preview.mydalil.com` reste protégé et non indexable.
- L'ancien prototype est passé en accès propriétaire uniquement ; son ancienne adresse technique renvoie désormais 401.
- Toutes les pages App Router sont classées dans `src/platform/siteRoutes.ts` ; le test de registre couvre 46 routes dédiées et les exclusions robots/sitemap.
- Alias de connexion et de compte normalisés dans `src/platform/routes.ts`, avec variantes françaises, anglaises et arabes.
- Vérifié localement : `pnpm check` réussi ; 222 tests unitaires réussis. La compilation Next.js et TypeScript réussit avec un secret local, puis le build s'arrête seulement faute de PostgreSQL local sur `localhost:5432`.
- Livraison : PR vers `preview`, puis build et parcours déployés à vérifier avant toute promotion vers `main`.

## Mise à jour — 14 novembre 2026 (soir) : écoles et photos des lieux publics

- PR #31 `agent/guides-annuaire-ecoles` → `preview` : les guides liés à une rubrique de l’annuaire montrent ses catégories non vides et 6 adresses. Cause corrigée : « École & famille » (Vie pratique) ne menait à aucune école. `pnpm check` OK ; build/e2e laissés à la CI.
- PR #32 (brouillon) `agent/photos-lieux-publics` → `preview` : collecte `scripts/import/fetch-place-photos.mjs` (workflow « Photos libres des lieux publics », lancé au push) puis migration différée `20261114_230000_photos_lieux_publics`.
- Sources : Wikidata, OpenStreetMap (wikimedia_commons), Commons géographique avec contrôle du nom. Pas de réseaux sociaux (conditions de Meta, droit d’auteur, décision annuaire du 2026-10-08).
- Prochaine action : attendre la fin du workflow (commit de `src/modules/annuaire/data/place-photos.json`), relire le volume trouvé, passer la PR #32 en prête, CI, test sur preview.
- Limite connue : les sources libres couvrent peu les écoles et mosquées de quartier. Couverture complète : Mapillary (compte à créer) ou Google Places (payant) — décision de Rad attendue.

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
- Lot 6 : CI entièrement verte et déploiement Vercel Preview réussi (PR #24).
- Lot 7 `agent/cockpit-lot7` (Historique et corbeille) : `/admin/cockpit/historique`, corbeille 30 jours sur les adresses (`trash: true`, migration `20261114_152745_cockpit_corbeille`, ajout de colonnes), purge quotidienne, SQL brut de l’annuaire filtré sur `deleted_at`, index de recherche mis à jour.
- Vérifié en local sur le lot 7 : corbeille → page 404 et hors index ; restauration → retour ; purge 31 j supprimée, 29 j gardée ; restaurer une version crée un brouillon sans toucher la version publiée ; 173 unitaires, 156 parcours réussis.
- Limite : la corbeille couvre les adresses seulement ; les autres collections suppriment toujours définitivement (administrateur seul).
- Lot 7 : CI d’abord en échec (tests e2e fragiles en parallèle, pas le code) ; correctif `fc3ae6d` poussé sur la branche du lot 7.
- Lot 8 `agent/cockpit-lot8` (Boîte unique) : `/admin/cockpit/boite`, emails reçus → demandes « email » (webhook prêt, DNS non touché), réponses avec fil, réponses préparées, note interne ; migration `20261114_154423_boite_unique` (valeur d’énumération + colonnes).
- Vérifié en local sur le lot 8 : enregistrement idempotent, anti-boucle ; 180 unitaires, 164 parcours réussis.
- Non vérifié : réception réelle d’un email (exige Resend Inbound + MX ou redirection Gandi, décision de Rad).
- Lot 8 : CI entièrement verte, déploiement Vercel réussi (PR #26). Lot 7 : la CI a échoué sur des tests instables en parallèle (tests différents à chaque passage, lot 8 au-dessus vert) ; job relancé.
- Lot 9 `agent/cockpit-lot9` (Communauté) : `/admin/cockpit/{moderation,annonces,pros,membres}`, score anti-arnaque `src/modules/annonces/risk.ts` (testé), badges Modération et Professionnels. Aucune migration.
- Vérifié en local sur le lot 9 : 187 unitaires, 177 parcours réussis.
- Lot 10 découpé : 10a Système `agent/cockpit-lot10a` (`/admin/cockpit/{ia,sante,securite}`), aucune migration ; 187 unitaires, 185 parcours réussis en local.
- Lots 7 et 9 : CI entièrement verte (après relance du lot 7).
- Lot 10b `agent/cockpit-lot10b` : `/admin/cockpit/{analytics,newsletter,finances,seo,couverture,traductions,recherches}` ; table `search_misses` (migration `20261114_170000_recherches_sans_resultat`, création de table seulement) ; 191 unitaires, 205 parcours réussis en local.
- Non livré : « Éditeur du site » (périmètre à définir avec Rad).
- Lot 11 `agent/cockpit-lot11` : accessibilité (axe-core, 25 écrans, clair et sombre, 0 défaut) ; revue indépendante : 18 défauts (5 élevés), tous corrigés ; tests ajoutés (tâche du CEO, test à froid refusé pendant l’arrêt, GET protégé). Local : 191 unitaires, 209 parcours réussis.
- 14 novembre 2026, soir : PR #19 à #30 fusionnées dans `preview` (feu vert de Rad), dernier commit `8b5fc9c`. Sur `preview` : « Frontières, types et tests unitaires », « Build et parcours essentiels », « Vercel » et « Parcours sur le déploiement » réussis.
- Avant la fusion, la CI du lot 11 a révélé une course dans Payload (deux connexions simultanées au même compte effacent une session) : tests sécurisés par `e2e/session.ts` ; défaut d’accessibilité du kanban vide corrigé. Reproduit et vérifié sur base neuve (209 parcours réussis).
- Non vérifié à l’œil : preview.mydalil.com exige une connexion Vercel puis un compte /admin.
- Prochaine action : promotion `preview` → `main` après feu vert explicite de Rad (migrations additives seulement : colonnes, tables, valeur d’énumération ; données différées `agents_equipe_icm`).
- Décisions attendues de Rad : clés ANTHROPIC/OPENAI et budget mensuel des agents ; bot Telegram (jeton, secret, identifiants) ; réception des emails (sous-domaine ou redirection Gandi) ; suspension de membre ; périmètre de l’« Éditeur du site » ; double authentification de l’équipe.

## Production — 15 novembre 2026

- `preview` promu en production (PR #34, feu vert de Rad) : `main` = `a509c94`, déploiement Vercel et « Parcours sur le déploiement » réussis.
- Panne ancienne trouvée et corrigée : `CRON_SECRET` absent en production, donc aucune tâche quotidienne n’avait jamais tourné (sauvegardes, rappels, expirations, index). Variable ajoutée (Production, Secret), production redéployée, passe lancée depuis Vercel › Cron Jobs. `/api/sante` : `taches.ok: true`, première sauvegarde `2026-11-15T00:01:42Z`. Issue #17 fermée.
- Accès : le compte Vercel `tablenow101` est membre de l’équipe `soualjawab1-6994` (projet `mydalil`) ; le connecteur Vercel de Claude lit les déploiements et journaux, mais Vercel lui refuse les variables de production (une valeur secrète se saisit par un humain).
- Observation non corrigée : chaque bouton « favori » appelle `GET /api/favorites` séparément (N requêtes par page de liste) ; pas d’erreur, coût inutile.

## Préparation du lancement — 15 novembre 2026

- Audit : projet Claude `claude/audit-2026-11-15-lancement.md` (coût par visite, données, finition).
- Branche `agent/optimisation-cout` : coût par visite (voir `src/platform/DECISIONS.md`), page d’erreur, `/test` retirée, fiches au nom provisoire hors des listes. Local, base neuve : check OK, lint 0 erreur, 191 unitaires, 213 parcours réussis ; liste 250 → 30 requêtes.
- À vérifier après déploiement : en-tête `x-vercel-cache` des listes `/services`, `/praticiens`, `/annonces` (cache CDN de 2 min).
- Reste avant lancement : lieux officiels (complétude, contacts, villes en français), photos, finition visuelle page par page, revue du cockpit avec Rad, CSS (365 Ko chargés partout).

## 2026-11-15 — Lancement, données (branche `agent/lancement-donnees`)
- Fait : migration différée des villes en français (`src/modules/annuaire/cityName.ts` + test). Base de test : 2 140 → 292 villes en arabe. `pnpm check` et `pnpm test` (194) réussis. Build et parcours : laissés à la CI.
- Non fait : contacts manquants (22 404 fiches), photos (choix A/B de Rad en attente), revue visuelle 375/1440, revue du cockpit avec Rad.
- En attente : accord explicite de Rad pour promouvoir `preview` vers `main` (lot coût `4d89d02`).

## 2026-11-15 — Rubriques rangées (branche `agent/rubriques-rangees`)
- Production : `main` = `0bb38c2` (lot coût + villes en français), vérifié par `/api/sante`.
- Fait sur cette branche : `CategoryTiles` (villes en raccourci + sous-catégories en cases) sur les pages de rubrique et de catégorie ; écoles rangées par niveau (`schoolCategory.ts`, migration différée `20261115_120000_ecoles_par_niveau`) ; diaporama d’accueil sans bureau officiel.
- Vérifié en local : `pnpm check`, `pnpm test` (197), `pnpm build`, page Collèges vue à 375 px et 1440 px. Parcours Playwright : laissés à la CI.
- Reste : cases de catégories vides non masquées ; mêmes rangements à faire pour les autres rubriques ; PR #31, #32 (conflit), #35 à reprendre ; photos ; contrôle de rendez-vous, annonces, services.

## 2026-11-15 — Santé, liste unique (branche `agent/sante-liste-unique`)
- `preview` contient #40 (rubriques rangées, écoles par niveau, titre d’accueil). Production inchangée : `main` = `0bb38c2`.
- Fait ici : page `/praticiens` en une seule liste ; lien d’inscription sur les fiches « Médecins ».
- Vérifié en local : check, build ; parcours des 13 rubriques en 375 px — 75 pages de catégorie, 13 fiches, 13 pages de ville : toutes à 200, au moins une fiche, aucune erreur de script.
- Reste : autres fourre-tout (Administrations, Services automobiles, Médecins sans spécialité) ; accueil à raccourcir (maquette d’abord) ; trois entrées du menu ; PR #31, #32, #35 ; promotion vers `main` après accord de Rad.

## 2026-11-15 — Rangement, suite (branche `agent/rangement-suite`)
- Contient : fourre-tout rangés (`categoryRules.ts`, migration `20261115_150000_fourre_tout_ranges`) ; quatre entrées au menu Vie pratique ; fusion des branches #31 (guides), #35 (photo d’illustration), #32 (photos libres et coordonnées, import corrigé, 13 images retirées).
- Base de test après migrations : 470 institutions créées, 204 fiches avec photo libre, 232 fiches complétées ; Dentistes 890.
- Parcours faits à la main en local, membre de test connecté : prise de rendez-vous confirmée (`/api/rdv` 201). Formulaire d’annonce, page prestataire et premier écran de l’espace pro affichés, mais envoi non vérifié.
- Constat : aucun test automatique ne couvre réservation, dépôt d’annonce, demande de service, inscription d’un pro. À écrire, avec un membre de test.
- Constat : en production, `/services/*` montre des prestataires « Exemple — … ». Décision de Rad attendue.
- Production inchangée : `main` = `0bb38c2`.
