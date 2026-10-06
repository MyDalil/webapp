# Socle (platform)

Département responsable : **Engineering & Platform**. Lire aussi `AGENTS.md` à la racine.

Le socle est partagé par tous les métiers et **n’importe jamais un module** (vérifié au build).

- `access.ts` — rôles admin/editor, `isStaff`, `isAdmin`, `publishedOrStaff`.
- `http.ts` — accès Payload, réponses JSON `no-store`, `isEmail`, `clean`.
- `mail.ts` — expéditeur `DALIL <salam@mydalil.com>`, gabarit, envoi unitaire et par lots, liens et en-têtes de désinscription. Pas de `server-only` ici : la CLI Payload doit pouvoir le charger.
- `auth/Users.ts` — comptes équipe /admin : premier compte admin, invitation, alertes mot de passe et email, 8 essais max.
- `storage/Media.ts` — photos (vignette 480×360, couverture 1600×900, texte alternatif obligatoire) sur Vercel Blob.
- `referentiel/catalog.ts` — secteurs, catégories et critères, guides, 69 wilayas. Modifier un secteur = vérifier `confiance` et les fiches existantes.
- `shell/`, `ui/` — en-tête, connexion, notifications, icônes de la maquette.

## Règles
- Toute nouvelle dépendance partagée arrive ici seulement si au moins deux métiers en ont besoin.
- Sécurité (Fondation 2, à faire) : limitation de débit des /api, MFA équipe, journal d’audit, contrôle des uploads, sauvegardes testées.

Décisions : `DECISIONS.md`.
