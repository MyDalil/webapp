# Communication

Département responsable : **Growth & Brand**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
Newsletter et campagnes : inscription, confirmation, bienvenue, envois, désinscription.

## Contenu du module
- Collection `subscribers` : double confirmation (CNIL), jetons de confirmation et de désinscription.
- Collection `campaigns` : envoi test à l’équipe, puis envoi unique aux abonnés confirmés (lots de 100, en-têtes List-Unsubscribe).
- Routes `/api/subscribers`, `/confirm`, `/unsubscribe` (RFC 8058) ; pages /newsletter/confirmation et /newsletter/desinscription.
- `ui/NewsletterForm`.

## Dépend de
`platform/mail`, `platform/http`.

## Événements
Inscription → email de confirmation ; confirmation → bienvenue ; campagne « Envoyer » → envoi groupé.

## Règles propres
- Jamais d’envoi à une adresse non confirmée ou désinscrite.
- Quota Resend gratuit : 3 000 emails/mois, 100/jour.
- Un envoi part une seule fois (garde `sentAt`).

## Accès
Resend.

## Skills
- `skills/envoyer-une-newsletter` — Préparer, tester et envoyer une newsletter DALIL depuis /admin.

## Prochaines étapes
- Statistiques d’ouverture et de clic (webhooks Resend).

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
