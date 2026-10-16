# Socle (platform)

Département responsable : **Engineering & Platform**. Lire aussi `AGENTS.md` à la racine.

Le socle est partagé par tous les métiers et **n’importe jamais un module** (vérifié au build).

- `access.ts` — rôles admin/editor, `isStaff`, `isAdmin`, `publishedOrStaff`.
- `http.ts` — accès Payload, réponses JSON `no-store`, `isEmail`, `clean`.
- `mail.ts` — expéditeur `DALIL <salam@mydalil.com>`, gabarit, envoi unitaire et par lots, liens et en-têtes de désinscription. Pas de `server-only` ici : la CLI Payload doit pouvoir le charger.
- `auth/Users.ts` — comptes équipe /admin : premier compte admin, invitation, alertes mot de passe et email, 8 essais max.
- `storage/Media.ts` — photos (vignette 480×360, couverture 1600×900, texte alternatif obligatoire) sur Vercel Blob ; `moderation` « À contrôler » pour les photos envoyées par les comptes.
- `storage/images.ts` — contrôle des fichiers envoyés (signature, 4 Mo, retrait des métadonnées), testé ; `storage/upload.ts` — enregistrement d’une photo de compte.
- `security/rateLimit.ts` — limitation de débit native (table `rate_limits` dans Neon, IP jamais stockée en clair) : connexion 20/15 min, mot de passe oublié 5/h par IP et 3/h par email, inscription 5/h, rendez-vous 20/h, demandes de service 10/h, messages 120/h, envois de fichiers 20/h, export 5/h. Ménage quotidien par `/api/taches`.
- `ai/` — IA réduite et encadrée : `clean.ts` (nettoyage simple sans IA, testé), `claude.ts` (appel direct à l’API Anthropic, Claude Haiku 4.5, sans SDK), `budget.ts` (comptes vérifiés seulement, 20 appels/jour/compte, plafond 10 $/mois, alerte email à 80 %, bascule automatique sur le nettoyage simple), `reformulate.ts` (une seule mission : remettre au propre sans omettre d’idée ni rien inventer), `AiUsage.ts` (compteur dans /admin › Pilotage). Clé : `ANTHROPIC_API_KEY` ; réglages : `AI_DAILY_QUOTA`, `AI_MONTHLY_BUDGET_USD`, `AI_ALERT_EMAIL`.
- `ui/SmartText.tsx` — champ de message commun (dictée en direct, brouillon nettoyé, ✦ Améliorer annulable) ; `ui/speech.ts` — dictée du navigateur, emplacement prévu pour un moteur spécialisé.
- `referentiel/communes.ts` — 1 541 communes (Wikidata, CC0, `scripts/import/fetch-communes.mjs`), distance interne ; `referentiel/languages.ts` — 4 langues.
- `referentiel/catalog.ts` — secteurs, catégories et critères, guides, 69 wilayas. Modifier un secteur = vérifier `confiance` et les fiches existantes.
- `shell/`, `ui/` — en-tête, connexion, notifications, icônes de la maquette.

## Règles
- Toute nouvelle dépendance partagée arrive ici seulement si au moins deux métiers en ont besoin.
- Sécurité (Fondation 2) : limitation de débit et contrôle des envois faits ; restent MFA équipe, journal d’audit, sauvegardes testées, `CRON_SECRET` avant l’ouverture.

Décisions : `DECISIONS.md`.
