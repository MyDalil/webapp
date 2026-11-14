# Socle (platform)

Département responsable : **Engineering & Platform**. Lire aussi `AGENTS.md` à la racine.

Le socle est partagé par tous les métiers et **n’importe jamais un module** (vérifié au build).

- `access.ts` — rôles patron/admin/editor (patron = Saïd : canal Telegram, Vie musulmane, rôle patron), agents IA (`isAgent`), `actorOf`, `publishedOrStaff` ; champs internes `isStaffField`, coordonnées `contactField` ; `guardPublication` (seul un administrateur publie, refus serveur) ; `markTechnicalUpdate` + `keepPublishedBase` (une mise à jour technique ne publie ni ne dépublie un brouillon en attente).
- `audit/` — journal d’audit greffé sur toutes les collections et réglages ; ajout seul (accès Payload + déclencheur Postgres).
- `controls/Controls.ts` — global « Commandes et sécurité » : arrêt général à 3 niveaux, agents, Telegram, maintenance, budget agents ; `agentsMayRun()`.
- `http.ts` — accès Payload, réponses JSON `no-store`, `isEmail`, `clean`.
- `mail.ts` — expéditeur `DALIL <salam@mydalil.com>`, gabarit, envoi unitaire et par lots, liens et en-têtes de désinscription. Pas de `server-only` ici : la CLI Payload doit pouvoir le charger.
- `auth/Users.ts` — comptes équipe /admin : premier compte admin (en ligne, uniquement avec l’email `DALIL_ADMIN_EMAIL`, à défaut salam@mydalil.com), invitation, alertes mot de passe et email, 8 essais max.
- `storage/Media.ts` — photos sur Vercel Blob, traitées par `sharp` : original plafonné à 2560 px, 4 formats WebP (vignette 480×360, carte 800×600, couverture 1600×900, partage 1200×630, jamais agrandis), point focal, texte alternatif obligatoire + arabe et anglais, empreinte SHA-256 `hash` (doublons) ; `moderation` « À contrôler » pour les photos envoyées par les comptes.
- `storage/usage.ts` (testé) + `mediaUsage.ts` — où une photo est utilisée (lit le schéma Payload, sans connaître les métiers) et remplacement partout (audité) ; routes `/api/medias/usage` (équipe) et `/api/medias/replace` (admin, patron).
- `storage/images.ts` — contrôle des fichiers envoyés (signature, 4 Mo, retrait des métadonnées), testé ; `storage/upload.ts` — enregistrement d’une photo de compte.
- `security/rateLimit.ts` — limitation de débit native (table `rate_limits` dans Neon, IP jamais stockée en clair) : connexion 20/15 min, mot de passe oublié 5/h par IP et 3/h par email, inscription 5/h, rendez-vous 20/h, demandes de service 10/h, messages 120/h, envois de fichiers 20/h, export 5/h, newsletter 5/h par IP et 3 emails/jour par adresse, contact 10/h, candidature 5/h, et toutes les routes publiques d’écriture. Ménage quotidien par `/api/taches`.
- `security/proof*.ts` — preuve de travail anti-robot, invisible et sans service tiers : défi signé (`/api/preuve`), calcul SHA-256 dans le navigateur (`proofClient.ts` → en-tête `x-dalil-preuve`), usage unique, exigée par newsletter, contributions, candidatures, demandes de contact. Testée (`proofCore.test.ts`, `e2e`).
- `monitoring/` — suivi des erreurs sans service tiers : `instrumentation.ts` › `recordError` regroupe par empreinte dans `error-logs` (/admin › Pilotage › Erreurs du site), compte les occurrences, rouvre une erreur « Résolue » qui revient, alerte email à la première occurrence (20/h au plus, `ERROR_ALERT_EMAIL` sinon l’équipe). `/api/sante` : état application + base, pour la surveillance.
- `backup/` — sauvegarde logique quotidienne (tâche `/api/taches`) vers Vercel Blob `backups/<env>/<date>/<table>.json.enc` (noms déterministes), instantané transactionnel commun (REPEATABLE READ), une table = un fichier compressé et chiffré AES-256-GCM, manifeste = noms exacts + empreintes SHA-256 + empreinte de clé, 30 jours gardés (ménage paginé). Clé : `BACKUP_SECRET` (recommandé, à garder aussi dans le coffre de l’équipe), sinon `PAYLOAD_SECRET`, sinon dérivée de l’URL de la base. Rotation : garder l’ancien secret 30 jours. Restauration : `pnpm payload migrate` sur la base cible puis `pnpm exec tsx scripts/restore-backup.ts <dossier ou URL du dossier Blob>` (empreintes contrôlées avant écriture) ; aller-retour vérifié à chaque CI. Objectifs : perte de données ≤ 24 h, reprise ≤ 4 h. Neon garde en plus son historique (restauration à un instant donné).
- `tasks/` — journal des tâches planifiées (`task-runs`) : verrou et idempotence par tâche et par jour, état, durée, volume, erreur ; `runTask`, `lastSuccess` (battement pour `/api/sante`).
- `mailing/` — suivi des emails (`email-deliveries`) : accepté, délivré, rebond, plainte, échec ; webhook signé `/api/resend/evenements` (`RESEND_WEBHOOK_SECRET`) ; ni contenu ni adresse en clair.
- `ai/` — IA réduite et encadrée : `clean.ts` (nettoyage simple sans IA, testé), `claude.ts` (appel direct à l’API Anthropic, Claude Haiku 5.5, sans SDK), `budget.ts` (comptes vérifiés seulement, 20 appels/jour/compte, plafond 10 $/mois, alerte email à 80 %, bascule automatique sur le nettoyage simple), `reformulate.ts` (une seule mission : remettre au propre sans omettre d’idée ni rien inventer), `AiUsage.ts` (compteur dans /admin › Pilotage). Clé : `ANTHROPIC_API_KEY` ; réglages : `AI_DAILY_QUOTA`, `AI_MONTHLY_BUDGET_USD`, `AI_ALERT_EMAIL`.
- `ui/SmartText.tsx` — champ de message commun (dictée en direct, brouillon nettoyé, ✦ Améliorer annulable) ; `ui/speech.ts` — dictée du navigateur, emplacement prévu pour un moteur spécialisé.
- `referentiel/communes.ts` — 1 541 communes (Wikidata, CC0, `scripts/import/fetch-communes.mjs`), distance interne ; `referentiel/languages.ts` — 4 langues.
- `referentiel/catalog.ts` — secteurs, catégories et critères, guides, 69 wilayas. Modifier un secteur = vérifier `confiance` et les fiches existantes.
- `shell/`, `ui/` — en-tête, connexion, notifications, icônes de la maquette.

## Règles
- Toute nouvelle dépendance partagée arrive ici seulement si au moins deux métiers en ont besoin.
- Sécurité (Fondation 2) : limitation de débit et contrôle des envois faits ; sauvegardes testées faites ; `CRON_SECRET` obligatoire (sans lui, la tâche quotidienne refuse de tourner et alerte) ; reste MFA équipe.

Décisions : `DECISIONS.md`.
