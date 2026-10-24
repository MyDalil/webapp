# Socle (platform)

Département responsable : **Engineering & Platform**. Lire aussi `AGENTS.md` à la racine.

Le socle est partagé par tous les métiers et **n’importe jamais un module** (vérifié au build).

- `access.ts` — rôles patron/admin/editor (patron = Saïd : canal Telegram, Vie musulmane, rôle patron), agents IA (`isAgent`), `actorOf`, `publishedOrStaff`.
- `audit/` — journal d’audit greffé sur toutes les collections et réglages ; ajout seul (accès Payload + déclencheur Postgres).
- `controls/Controls.ts` — global « Commandes et sécurité » : arrêt général à 3 niveaux, agents, Telegram, maintenance, budget agents ; `agentsMayRun()`.
- `http.ts` — accès Payload, réponses JSON `no-store`, `isEmail`, `clean`.
- `mail.ts` — expéditeur `DALIL <salam@mydalil.com>`, gabarit, envoi unitaire et par lots, liens et en-têtes de désinscription. Pas de `server-only` ici : la CLI Payload doit pouvoir le charger.
- `auth/Users.ts` — comptes équipe /admin : premier compte admin (en ligne, uniquement avec l’email `DALIL_ADMIN_EMAIL`, à défaut salam@mydalil.com), invitation, alertes mot de passe et email, 8 essais max.
- `storage/Media.ts` — photos (vignette 480×360, couverture 1600×900, texte alternatif obligatoire) sur Vercel Blob ; `moderation` « À contrôler » pour les photos envoyées par les comptes.
- `storage/images.ts` — contrôle des fichiers envoyés (signature, 4 Mo, retrait des métadonnées), testé ; `storage/upload.ts` — enregistrement d’une photo de compte.
- `security/rateLimit.ts` — limitation de débit native (table `rate_limits` dans Neon, IP jamais stockée en clair) : connexion 20/15 min, mot de passe oublié 5/h par IP et 3/h par email, inscription 5/h, rendez-vous 20/h, demandes de service 10/h, messages 120/h, envois de fichiers 20/h, export 5/h, newsletter 5/h par IP et 3 emails/jour par adresse, contact 10/h, candidature 5/h, et toutes les routes publiques d’écriture. Ménage quotidien par `/api/taches`.
- `security/proof*.ts` — preuve de travail anti-robot, invisible et sans service tiers : défi signé (`/api/preuve`), calcul SHA-256 dans le navigateur (`proofClient.ts` → en-tête `x-dalil-preuve`), usage unique, exigée par newsletter, contributions, candidatures, demandes de contact. Testée (`proofCore.test.ts`, `e2e`).
- `monitoring/` — suivi des erreurs sans service tiers : `instrumentation.ts` › `recordError` regroupe par empreinte dans `error-logs` (/admin › Pilotage › Erreurs du site), compte les occurrences, rouvre une erreur « Résolue » qui revient, alerte email à la première occurrence (20/h au plus, `ERROR_ALERT_EMAIL` sinon l’équipe). `/api/sante` : état application + base, pour la surveillance.
- `backup/` — sauvegarde logique quotidienne (tâche `/api/taches`) vers Vercel Blob `backups/<env>/<date>/`, une table = un fichier compressé et chiffré AES-256-GCM (clé dérivée du secret Payload), 30 jours gardés. Restauration : `pnpm payload migrate` sur la base cible puis `pnpm exec tsx scripts/restore-backup.ts <dossier ou URL>` ; aller-retour vérifié à chaque CI. Neon garde en plus son historique (restauration à un instant donné).
- `ai/` — IA réduite et encadrée : `clean.ts` (nettoyage simple sans IA, testé), `claude.ts` (appel direct à l’API Anthropic, Claude Haiku 5.5, sans SDK), `budget.ts` (comptes vérifiés seulement, 20 appels/jour/compte, plafond 10 $/mois, alerte email à 80 %, bascule automatique sur le nettoyage simple), `reformulate.ts` (une seule mission : remettre au propre sans omettre d’idée ni rien inventer), `AiUsage.ts` (compteur dans /admin › Pilotage). Clé : `ANTHROPIC_API_KEY` ; réglages : `AI_DAILY_QUOTA`, `AI_MONTHLY_BUDGET_USD`, `AI_ALERT_EMAIL`.
- `ui/SmartText.tsx` — champ de message commun (dictée en direct, brouillon nettoyé, ✦ Améliorer annulable) ; `ui/speech.ts` — dictée du navigateur, emplacement prévu pour un moteur spécialisé.
- `referentiel/communes.ts` — 1 541 communes (Wikidata, CC0, `scripts/import/fetch-communes.mjs`), distance interne ; `referentiel/languages.ts` — 4 langues.
- `referentiel/catalog.ts` — secteurs, catégories et critères, guides, 69 wilayas. Modifier un secteur = vérifier `confiance` et les fiches existantes.
- `shell/`, `ui/` — en-tête, connexion, notifications, icônes de la maquette.

## Règles
- Toute nouvelle dépendance partagée arrive ici seulement si au moins deux métiers en ont besoin.
- Sécurité (Fondation 2) : limitation de débit et contrôle des envois faits ; sauvegardes testées faites ; restent MFA équipe, `CRON_SECRET` avant l’ouverture.

Décisions : `DECISIONS.md`.
