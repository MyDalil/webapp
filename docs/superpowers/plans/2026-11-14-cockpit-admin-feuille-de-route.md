# Cockpit admin DALIL — feuille de route

> Plans détaillés : un fichier par lot, dans ce dossier. Chaque lot = une branche dédiée depuis `preview`, une PR vers `preview`, testée sur preview.mydalil.com, puis feu vert de Rad.

**But :** un cockpit unique pour piloter le site, la société et l'équipe d'agents. Clair et sombre. FR, AR (RTL), EN. Ordinateur et mobile.

**Références validées :**
- Maquettes (6 écrans) : artefact « DALIL Admin — maquettes ».
- Organisation ICM et équipe : document projet `claude/organisation-agents-icm.md`.
- Plan d'origine (16 modules) : document projet `claude/dashboard-admin-plan.md`.

## Décisions de Rad (14 nov. 2026)

- Densité hybride : accueil dense, écrans de travail aérés.
- Responsive complet, téléphone et ordinateur à égalité.
- Langue de l'admin : FR par défaut, AR (RTL) et EN en un clic.
- Finances : écrans complets, paiement branché plus tard.
- Autonomie mixte : exécution seule des tâches sans risque ; le reste en validation.
- Notification avant, pendant, après chaque action d'agent, avec le travail joint (admin + Telegram Saïd + Telegram Rad + email).
- `action_id` unique (UUIDv7) pour chaque action, lié à l'historique de la fiche.
- Organisation ICM : dossiers par département ; 6 rôles actifs, 10 en réserve activables en un clic, sans déploiement.
- Mémoire des agents dans Neon. Interdictions dures dans le code des outils.

## Lots

| Lot | Contenu | Dépend de | Besoin externe |
|---|---|---|---|
| 1 | Socle du cockpit : coquille (menu, barre ⌘K, thème clair/sombre, langue FR/AR/EN), vue Pilotage branchée sur Neon | — | — |
| 2 | Traçabilité et politique : `action_id` dans `AuditLog`, politique Propose/Exécute dans Neon, refus dur dans les outils, bus de notifications | 1 | — |
| 3 | Moteur d'agents ICM : dossier `company/`, exécuteur unique, file de jobs Payload, arrêt coopératif, 6 rôles actifs + 10 en réserve, activation + test à froid | 2 | Clés Anthropic et OpenAI (Vercel AI Gateway) |
| 4 | Telegram : webhook signé, liste blanche Saïd + Rad, commandes (`/activer`, `/pause`, `/stop`…), notifications, brouillons du canal | 2 | Jeton du bot, identifiants Telegram de Saïd et Rad |
| 5 | Agents dans l'admin : Salle de contrôle, Tâches, Validation, Conversations, Fil d'activité, Mémoire et skills, Connecteurs | 3, 4 | — |
| 6 | Médiathèque : glisser-déposer, 4 formats, WebP, point focal, alt FR/AR/EN, doublons, remplacer partout | 1, 2 | — |
| 7 | Édition de fiche : aperçu FR/AR/EN, propositions d'agents, historique, restauration, corbeille 30 jours | 1, 2, 6 | — |
| 8 | Boîte unique : emails, formulaires, Telegram, signalements, réponses préparées | 2, 4 | Réception d'emails (Resend Inbound : enregistrement MX chez Gandi) |
| 9 | Communauté : Modération, Annonces (score anti-arnaque), Professionnels, Membres | 1, 2 | — |
| 10 | Business et système : Newsletter, Traductions, Couverture, Recherches sans résultat, SEO, Analytics, Finances, IA et coûts, Sécurité, Santé technique, Audit, Réglages, Éditeur du site | 1, 2 | — |
| 11 | Finition : mobile, accessibilité WCAG AA, parcours e2e de chaque écran, revue de sécurité | tous | — |

## Règles de chaque lot

- Applique `ui-ux-pro-max` ; vérifie à 375 px et 1440 px ; clair et sombre.
- Un parcours essentiel nouveau = un test `e2e/`.
- `pnpm check`, `pnpm test`, `pnpm build`, `pnpm test:e2e` avant la PR.
- Mise à jour de `docs/agent-handoff.md` et du `DECISIONS.md` du module.
- Vie musulmane : jamais accessible à un agent.
