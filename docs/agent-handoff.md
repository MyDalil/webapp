# Reprise — 24 novembre 2026

## Mise à jour — 24 novembre 2026 (soir) : retours de Rad sur preview

- Branche `agent/recherche-carte`, créée depuis `preview`.
- Recherche : « médecin aït chafâa » mettait « Spécialiste Medecine interne · Freha » devant « salle de soins · Aït Chafâa ». Cause : bonus de distance trop faible (adresse à 4,4 km du centre de la commune). Correction : +4 aux adresses de la commune nommée (propositions et résultats). Vérifié sur la base locale : « salle de soins » passe en tête, les adresses alentour suivent.
- Fiche sans photo ni illustration : la carte en couleur remplace le visuel neutre dans le cadre 4:3 ; la mini-carte n’est plus doublée. Vérifié en local : `pg-main pg-map` rendu sur la fiche « salle de soins ».
- `pnpm check`, `pnpm test` (691), `pnpm lint` 0 erreur, `pnpm build` OK.

## Mise à jour — 24 novembre 2026 : chantier performance (build, images, recherche)

- Branche `agent/performance-socle`, créée depuis `preview` (a815a1a) ; deux lots codés en parallèle (`agent/perf-images`, `agent/perf-photos`) puis fusionnés. Demande de Rad : appliquer le plan et livrer sur preview pour les tests clients.
- Build : 50 adresses pré-construites (au lieu de 400). Mesuré en local sur base complète (48 169 adresses) : 1 720 → 670 pages, `pnpm build` 271 s → 175 s.
- Accueil : fonds photo chargés à l’approche de l’écran (`LazyBackgrounds`, `lazyBg`), diaporama limité à la diapo active + suivante, tuiles Wikimedia en 960 px. Mesuré sur le HTML de l’accueil : 2 photos chargées d’emblée (diaporama) au lieu d’environ 70 (37 Mo mesurés en production avant), 82 fonds différés.
- Recherche : flou dans le corps seulement en repli (< 40 correspondances exactes). Mesuré : « restaurant oran » 462 + 283 ms → 114 + 13 ms (liste + total).
- Photos libres : tâche quotidienne `photos-libres` (60 par passe, `PHOTOS_IMPORT_DAILY_MAX`) qui copie la première photo Wikimedia de chaque adresse dans Media (Blob), crédit, licence et source conservés ; ThumbHash calculé à l’envoi ; migration additive `20261124_202518_photos_libres_thumbhash`.
- Décisions sans code : pas de Cache Components, pas d’outbox emails, porte MCP unique confirmée (voir src/platform/DECISIONS.md).
- Vérifié localement : `pnpm check` OK (731 fichiers), `pnpm test` 103 fichiers / 687 tests OK, `pnpm lint` 0 erreur, `pnpm build` OK avec base. **Non vérifié en local** : e2e (Chromium non téléchargeable dans le bac à sable) → CI ; appels réels à Wikimedia et Vercel Blob (première passe de la tâche quotidienne à surveiller dans /admin › Pilotage › Tâches planifiées).
- Relecture Fable (lecture seule) : rien de bloquant ; corrigé ensuite — échecs mémorisés 30 jours (table `photos_libres_echecs`, migration `20261124_230000`), arrêt sur 401/403 et après 3 erreurs de suite, lecture bornée à 4 Mo sans `content-length`, redirection hors Wikimedia refusée, tâche notée en échec si rien n’est copié, marge de 20 s sur le budget, crédit posé si licence absente, préchargement du diaporama au survol d’un point, taille Media `large` non recadrée pour la galerie (migration `20261124_204729`), helpers de taille sortis dans `photoSizes.ts` (en-tête plus léger). Reste connu : une adresse copiée gagne jusqu’à 8 points de score à son prochain enregistrement ordinaire (photo comptée deux fois).
- Après corrections : `pnpm check` OK (732 fichiers), `pnpm test` 103 fichiers / 691 tests OK, `pnpm lint` 0 erreur, `pnpm build` OK (160 s).
- Prochaine action : CI verte → fusion dans `preview` → test client sur preview.mydalil.com ; migration à appliquer par le build preview (base Neon de preview).


## Mise à jour — 19 novembre 2026 : noyau léger + actions + MCP + télécommandes

- Branche `agent/noyau-mcp-complet`, créée depuis `preview` (a2ba53d). Code écrit par 8 lots en parallèle, fusionné à la main. **Non commité, non poussé** au moment de cette note : feu vert de Rad attendu.
- Diagnostic et liste complète des exigences : projet claude.ai MyDALIL, `claude/audit-2026-11-19-architecture-modulaire.md`.
- Décisions : pas de table `fiches` unique (les collections restent) ; une couche d'actions commune (`src/platform/actions/`, `src/registry.ts`) appelée par le site (`callAsSite`), le MCP (`/api/mcp` public lecture seule, `/api/mcp/admin` clé API ou OAuth), Telegram et WhatsApp (`src/modules/communication/remote/`) ; toute écriture hors admin = brouillon ; publication = clic patron/admin.
- Extras débranchés par `DALIL_PLUGINS` (défaut `communication`) : cockpit et agents éteints, tables conservées. `prodMigrations` retiré.
- Ajouts : PWA (manifest, `public/sw.js`, page hors-ligne), robots des IA, `llms.txt`, schema.org et aperçus de liens sur 5 fiches, barre Appeler/WhatsApp/Itinéraire/Partager, OAuth 2.1 sans base, import CSV avec doublons, contrôle de sécurité, restauration, traduction FR/EN/AR stockée dans `translations`, alt automatique, newsletter en une commande, sponsorisation marquée « Sponsorisé » (indépendante de la vérification), kit QR « Vérifié sur DALIL », variantes des 69 wilayas, pages `moments`, FAQ.
- Migration : `20261119_095728_allegement_traductions_mises_en_avant` (testée en local sans PostGIS ; la CI la prouvera depuis zéro).
- Vérifié localement : `pnpm check` OK (599 fichiers) ; `pnpm test` 68 fichiers, 491 tests OK (après corrections de la relecture de sécurité : publication à distance seulement après clic signé, lots MCP bornés à 10, erreurs internes masquées, secret Telegram en temps constant, clé API refusée si compte verrouillé, « À vérifier » jamais public, import CSV via le registre et borné à 1 Mo ; reste ouvert : révocation d’une famille de jetons OAuth réutilisée, valeurs mcp/whatsapp/site du champ canal de l’audit) ; `pnpm lint` 0 erreur ; `next build` : compilation réussie, arrêt ensuite à la collecte des pages faute de base locale (comme avant). **Non vérifié** : build complet avec base, e2e, rendu visuel à 375/1440 px, appels réels à Telegram, Meta, OpenAI, Anthropic.
- Second tour (même branche, toujours **non commité**) — lots F, G, H1, H2, I :
  - F (CI et e2e) : CI en deux passes sur base neuve — « Build et parcours essentiels » (configuration de production) et « Build et parcours des extras (cockpit, agents) » ; nouveaux parcours e2e (télécommande, MCP, import, contrôle…). En passe production, `DALIL_TEST_REMOTE=1` : `/api/telegram` renvoie le texte répondu (champ `reponse`, jamais si `VERCEL_ENV=production`) ; test `/etat` ajouté (admin : état du site ; visiteur : refus).
  - G (sécurité des canaux) : arrêt général par Telegram (`/finir`, `/relancer`, bouton Confirmer) ; boutons signés à usage unique avec expiration ; limites par compte ; secrets dédiés `OAUTH_SECRET` et `REMOTE_SIGNING_SECRET` (32 caractères au moins, obligatoires en production) ; révocation de toute la famille d’un jeton OAuth réutilisé. WhatsApp : un message en erreur est journalisé (`recordError`) et reçoit « Erreur, réessayez. » sans bloquer les suivants.
  - H1 (traductions et import) : traductions rafraîchies à la modification + rattrapage quotidien (`TRANSLATE_DAILY_MAX`, 50 par défaut) ; import CSV par lots de 150 lignes (`depuis`/`suite`) ; `/csv` simule un lot (avec le total), `/csv confirmer` enchaîne les lots (15 au plus, reprise `/csv confirmer depuis N`) ; limite unique `MAX_CSV_BYTES`/`MAX_CSV_LABEL`.
  - H2 (données) : cache FAQ/moments ; table `payments` ; champ `country` (liste unique `src/platform/referentiel/countries.ts`) ; expiration des sponsorisations.
  - I (admin et site) : accueil de l’équipe dans /admin, vue Contrôle (`/admin/controle`, enregistrée dans `payload.config.ts`, carte des composants régénérée), liens équipe vers `/admin/import` et `/admin/controle` ; libellés trilingues (FAQ, « Sponsorisé », « Itinéraire » via `lang`) ; barre d’actions responsive vérifiée en capture sur une page de démonstration (pas sur une vraie fiche).
  - 2 migrations : `20261119_095728` et `20261119_110529`. **À passer d’abord sur une branche Neon copiée de la production**, avant toute fusion vers `main`.
  - Vérifié localement (intégration finale) : `pnpm check` OK (627 fichiers) ; `pnpm test` 78 fichiers, 550 tests OK ; `pnpm lint` 0 erreur (1284 avertissements) ; `pnpm build` : compilation et TypeScript réussis, arrêt à la collecte des pages faute de base (attendu) ; `playwright test --list` : 326 tests, 23 fichiers. **Non vérifié** : e2e exécutés, build avec base, migrations sur copie de production, appels réels Telegram/Meta.
- Troisième tour (même branche, toujours **non commité**) — lots J, K, L1, L2, M, puis intégration finale :
  - J (bot public guidé) : sessions `bot-sessions`, brouillon d’établissement par Telegram/WhatsApp, lien signé `/finaliser` (`finalizeLink`/`verifyFinalizeToken`, 7 jours).
  - K (schéma) : `subscriptions`, `claims`, `claim-documents`, `leads`, `metrics-daily`, `bot-sessions`, global `pricing`, `Places.owner`, champs de `payments` ; vue `/admin/validation` ; actions `activer_abonnement`, `refuser_abonnement`, `decider_revendication`.
  - L1 (parcours pro) : `/inscrire`, `/revendiquer`, `/finaliser`, `/espace-pro/abonnement`, `/pro/<slug>`.
  - L2 (paiements) : Chargily (DZD), Stripe (EUR), webhooks, `valider_paiement`, `paiements_en_attente` (voir `docs/paiements.md`).
  - M : demandes `leads` (`/api/leads`), compteurs `metrics-daily` (`/api/m`), classement « Partenaire », assistant Premium, transcription configurable.
  - Intégration : bouchons L1 et M remplacés (getPricing, planOf, createCheckout, verifyFinalizeToken ; `contrats.ts` supprimé) ; règle unique du prix annuel (12 − `annualFreeMonths` mois payés pour 12 mois) ; `confirmer_paiement` supprimée au profit de `valider_paiement` ; table CONFIRM déplacée dans `src/platform/telegram/callback.ts` (codes `a`, `u`, `d-ok|no`, `v`) et boutons signés émis par L1/L2 ; une seule voie de reçu (`/api/pro/abonnement` → `submitPaymentReceipt`, `/api/paiement/recu` supprimée) ; registre : `paymentActions`, `metricsActions` ; e2e `validation.spec.ts`, `leads.spec.ts`.
  - Migrations : `20261119_112942_abonnements_revendications_demandes` et `20261119_113904_paiements_justificatif` (additive : `payments.proof_file_id`). Appliquées sur la base locale de test seulement. **À passer d’abord sur une branche Neon copiée de la production.**
  - Variables Vercel à créer : `CHARGILY_SECRET_KEY`, `CHARGILY_MODE` (test|live), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TELEGRAM_BOT_USERNAME`, `TRANSCRIBE_PROVIDER` (openai|groq), `GROQ_API_KEY` (si groq).
  - Vérifications de l’intégration : voir le rapport de fin de tour (check, test, lint, build sans base). **Non vérifié** : e2e exécutés, build avec base, paiements réels, rendu 375/1440 px des nouvelles pages.
- Prochaine action : feu vert de Rad → commit, push, PR vers `preview` → CI → test sur preview.mydalil.com.
- À faire hors code : variables Vercel (`DALIL_MCP_KEYS`, `OAUTH_SECRET`, `REMOTE_SIGNING_SECRET`, `TELEGRAM_GROUP_ID`, `OPENAI_API_KEY`, WhatsApp), rebrancher le webhook Telegram (`/api/telegram/setup`) pour les boutons, lier un groupe au canal, domaine `mcp.mydalil.com`, compte WhatsApp Business vérifié par Meta, soumission aux répertoires ChatGPT et Claude.

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

## 2026-11-15 — Production `8daf941`, puis accueil court (branche `agent/accueil-court`)
- Production : `main` = `8daf941` (13 h 27 UTC), vérifiée sur www.mydalil.com : rubriques rangées, Santé en liste unique, fourre-tout rangés, 471 institutions importées, photos libres, plus de prestataire d’exemple.
- Sur cette branche, pour `preview` seulement : accueil en six blocs (10 400 → 5 658 px à 1440 px) ; diaporama sans lieu de santé ; annonces d’exemple masquées en production ; remplacement annuaire pour déménagement et cours ; `e2e/membre.spec.ts` couvre rendez-vous, dépôt d’annonce, demande de service, fiche de prestataire (8 réussis en local).
- Blocs retirés de l’accueil : Santé, À domicile, Vie musulmane, destination en parallaxe, Papiers, Repères, Installation. Code mort laissé dans `HomeView.tsx` (variables `musulmane`, `dest`) : à nettoyer si Rad valide.
- Reste : promotion vers `main` après accord de Rad ; relecture une à une des photos libres ; ménage et aide à domicile sans professionnel à montrer.

## 2026-11-15 (soir) — Fiches et carte (branche `agent/fiches-et-carte`)
- Demandes de Rad : bloc Sahara remis sur l’accueil ; repère sur la carte d’une fiche ; fiches d’exemple de retour en production (prestataires, annonces) ; médecins de l’annuaire au format de fiche riche sur `/praticiens` ; états vides qui invitent à s’inscrire.
- Vérifié en local : check, build, 90 parcours (dont `membre`), repère présent sur une fiche (`.maplibregl-marker`). Fond de carte non vérifiable en local (tuiles bloquées) : à voir sur preview.
- Production inchangée : `main` = `8daf941` (les prestataires d’exemple y sont encore masqués jusqu’à la prochaine promotion).

## 2026-11-16 — Lot fiches et carte (branche `agent/fiches-et-carte`, PR #46)
- Contenu : repère et caméra de la carte (`DirectoryMap`), bloc Sahara remis, fiches d’exemple de retour en production (sans avis ni missions affichés), médecins de l’annuaire au format de fiche (« Sur appel »), logo officiel (`Places.logo` + taille média `logo`, migrations `20261116_085202_place_logo` et `20261116_090342_media_logo_size`, ajouts seulement), contrôle de coût recentré.
- Relu par Fable (advisor) ; ses 7 remarques traitées.
- Local : check, 201 tests, build, 88 parcours dont le repère de carte ; 375 px et 1440 px sans débordement. Le parcours « service » d’un membre échoue en local seulement (créneaux déjà pris par des essais précédents sur la même base) ; il passe sur base neuve en CI.
- Méthode de travail (Rad, 2026-11-16) : Opus exécute ; Fable donne son avis quand le lot le justifie, puis Opus applique.

## 2026-11-16 — Branche agent/fiches-et-carte
- Fait : fond de carte réparé (worker MapLibre copié au build), repère = itinéraire, pages guide au standard validé, étoiles ✦ remplacées par des pictogrammes.
- Vérifié en local : check, 229 tests unitaires, build, 224 parcours Playwright (36 ignorés).
- Prochaine action : vérifier sur preview que le fond de carte se dessine ; questions à Rad sur Services et Santé avant toute maquette.

## Mise en production — 19 nov. 2026 (soir)
- Avis Fable avant promotion : GO sous conditions. Levées dans `agent/beta-finitions` :
  - point de restauration `sauvegardes.places_noms_20261119` (migration 20261119_185900, avant la réécriture différée des noms) ; requête de restauration dans le fichier de migration ;
  - sigles gardés en majuscules dans `tidyCase` (ENSV, CNFPH, INPED, C.F.P.A…). Sur la base de preview, les sigles déjà abîmés restent à corriger ; la production est réécrite avec la règle corrigée.
- Cockpit et agents éteints en production (choix de Rad : « garder uniquement ce qui maintient le site »). Les rallumer : `DALIL_PLUGINS=cockpit,communication` (ou `agents,cockpit,communication`) dans Vercel Production.
- Contrôle /admin/controle : plus de fausse alerte sur preview ; bouton Telegram sans JSON brut.
- À surveiller : collection `translations` lisible par tous (traductions d'une fiche dépubliée), route /api/kit non relue, première tâche planifiée et sauvegarde en production, /api/sante.

## 2026-11-19 (soir) — Interrupteurs de rubriques (branche `agent/interrupteurs`, non commité)
- Demande de Rad : couper ou rallumer chaque rubrique et chaque catégorie en un clic dans /admin ; une partie coupée affiche « revient sous peu ».
- Code : `src/platform/controls/sections.ts` (clés, arbre, filtres, testé), `offSections.ts` (lecture en cache `controls`), champs `offSections`/`offMessage` du global `controls`, action `basculer_section`, route `/api/rubriques`, vue `/admin/rubriques` (`RubriquesView` + `RubriquesSwitches`), lien équipe et case « Rubriques coupées » ; pages publiques enveloppées par `withSectionGate` (`src/platform/ui/SectionGate.tsx`, bloc `ComingSoon`) ; fiches (`placeGate`) ; filtres recherche (`searchEverything`, `suggest`), actions annuaire, plan du site.
- Migration additive `20261119_200525_offsections_rubriques` (2 colonnes sur `controls`), générée par `payload migrate:create` à partir de l’instantané de la migration précédente (aucune base locale démarrée : `initdb` refusé en root) ; non appliquée en local, la CI la prouvera sur base neuve.
- Vérifié en local : `pnpm check` OK, `pnpm test` 100 fichiers / 668 tests OK, `pnpm lint` 0 erreur, `playwright test --list` OK (338 tests, dont `e2e/rubriques.spec.ts`). **Non vérifié** : build complet, e2e exécutés, rendu 375/1440 px.
- Limites : liste `/annuaire/<secteur>?category=…` (liens du menu) non coupée côté serveur pour une catégorie seule (page ISR qui ne lit pas la requête) ; la catégorie dédiée `/annuaire/<secteur>/<catégorie>` l’est. Total d’adresses de la recherche et réponses CDN de `/api/recherche` (5 min) peuvent garder un court décalage.
- Prochaine action : relecture, commit, PR vers `preview`, e2e en CI, essai sur preview.mydalil.com.
