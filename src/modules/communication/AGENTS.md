# Communication

Département responsable : **Growth & Brand**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
Newsletter et campagnes : inscription, confirmation, bienvenue, envois, désinscription.

## Contenu du module
- Collection `subscribers` : double confirmation (CNIL), jetons de confirmation et de désinscription.
- Collection `campaigns` : envoi test à l’équipe, puis envoi unique aux abonnés confirmés (lots de 100, en-têtes List-Unsubscribe).
- Collection `telegram-posts` : publications du canal DALIL (7 900 abonnés). Brouillons par l’équipe et les agents ; programmer, publier, retirer : Saïd seul (contrôle serveur).
- Routes `/api/subscribers`, `/confirm`, `/unsubscribe` (RFC 8058) ; pages /newsletter/confirmation et /newsletter/desinscription.
- `ui/NewsletterForm`.
- `remote/` — télécommande commune (Telegram, WhatsApp) : `parse.ts` (commandes, choix d’action, formats, testé), `core.ts` (identification équipe/visiteur, actions du registre injectées par la route, brouillon + boutons signés, vocal, photo, contribution, testé), `understand.ts` (langage naturel → une action, Claude Haiku, usage IA « channel »), `media.ts` (transcription OpenAI), `visitor.ts` + `visitorText.ts` (bot public fermé sans IA : menu, parcours Chercher et Inscrire, FR/EN/AR, testé), `validate.ts` (wilaya, nom, activité, téléphone, testé), `sessions.ts` (état des parcours, collection `bot-sessions`), `finalize.ts` (`finalizeLink`, `verifyFinalizeToken` : lien signé /finaliser, testé). Aucune logique métier : tout passe par les actions du registre.
- `telegram/` — `bot.ts` (adaptateur Telegram : privé, groupe lié au canal en lecture seule, boutons), `channel.ts` (publication sur le canal décidée par Saïd, retrait, échéances).
- `whatsapp/` — `signature.ts` (signature Meta, vérification GET, testé), `webhook.ts` (adaptateur WhatsApp Cloud API : messages, médias, boutons « reply »).
- Routes `/api/telegram` (webhook signé `TELEGRAM_WEBHOOK_SECRET`), `/api/telegram/setup` (admin), `/api/whatsapp` (Meta, signé `WHATSAPP_APP_SECRET`). Mise en place : `docs/canaux.md`.

## Dépend de
`platform/mail`, `platform/http`.

## Événements
Inscription → email de confirmation ; confirmation → bienvenue ; campagne « Envoyer » → envoi groupé.

## Règles propres
- Jamais d’envoi à une adresse non confirmée ou désinscrite.
- Quota Resend gratuit : 3 000 emails/mois, 100/jour.
- Un envoi part une seule fois (garde `sentAt`).

## Accès
Resend. Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_GROUP_ID`, `TELEGRAM_BOT_USERNAME`). WhatsApp (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`). Boutons signés `REMOTE_SIGNING_SECRET` (sinon `PAYLOAD_SECRET`). Vocal `OPENAI_API_KEY`.

## Skills
- `skills/envoyer-une-newsletter` — Préparer, tester et envoyer une newsletter DALIL depuis /admin.

## Prochaines étapes
- Statistiques d’ouverture et de clic (webhooks Resend).

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
