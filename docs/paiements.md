# Paiements en ligne et reçus — DALIL

Code : `src/modules/pros/payments/` (porte `@/modules/pros`), routes `src/app/api/paiement/`. Aucun SDK : appels HTTP `fetch`.
Règle 4 : un paiement n’achète jamais la vérification ni le label « Vérifié ».

## Ce qui existe
| Moyen | Devise | Comment | Activation |
|---|---|---|---|
| Chargily Pay V2 (CIB, Edahabia) | DZD | `createCheckout({ provider: 'chargily', … })` → page Chargily | automatique au webhook signé |
| Stripe Checkout (carte) | EUR | `createCheckout({ provider: 'stripe', … })` → page Stripe | automatique au webhook signé |
| BaridiMob, CCP, virement, espèces | DZD ou EUR | `POST /api/pro/abonnement` (mode « reçu », membre connecté, justificatif ; logique `submitPaymentReceipt`) | clic de l’équipe : action `valider_paiement` |

Activation selon `purpose` : `abonnement` → `activateSubscription` (lot K) ; `boost` et `projecteur` → mise en avant liée (`sponsorship`), activée par l’action existante `activer_sponsoring` ; `leads` et `autre` → rien d’automatique, l’équipe est prévenue.
Si l’activation échoue (ou si `activateSubscription` n’est pas encore livré), le paiement reste « Reçu » et l’équipe reçoit « Activation à faire à la main ».

## Montants (une seule règle)
- `amount.value` donné à `createCheckout` : **unités** (dinars ou euros), comme le global `pricing`.
- `payments.amount` : **centimes entiers** (1 500 DA = 150000).
- Chargily `amount` : entier en dinars (exemple officiel : `"amount": 2000, "currency": "dzd"`) → centimes ÷ 100. Aucun minimum n’est indiqué dans les pages consultées : à vérifier avec Chargily.
- Stripe `unit_amount` : « smallest currency unit » → centimes d’euro tels quels.
- Le webhook contrôle montant **et** devise contre le paiement enregistré ; un écart = rien n’est activé, alerte à l’équipe.

## Comptes à ouvrir
1. **Chargily Pay** (pay.chargily.com) : compte marchand, vérification du compte (pièces de l’entreprise) pour le mode live. Clés API dans le tableau de bord, une paire par mode (test, live).
2. **Stripe** (dashboard.stripe.com) : compte pour l’entité qui encaisse en euros. Clés `sk_test_…` / `sk_live_…`.

## Variables Vercel (jamais dans le code)
| Variable | Valeur |
|---|---|
| `CHARGILY_SECRET_KEY` | clé secrète Chargily (test : `test_sk_…`). Sert aussi à vérifier la signature des webhooks. |
| `CHARGILY_MODE` | `test` ou `live` (facultatif : déduit de la clé, `test_…` = test). Test : `https://pay.chargily.net/test/api/v2` ; live : `https://pay.chargily.net/api/v2`. |
| `STRIPE_SECRET_KEY` | `sk_test_…` en preview, `sk_live_…` en production. |
| `STRIPE_WEBHOOK_SECRET` | secret `whsec_…` du point d’arrivée (différent en test et en live). |

Sans clé, le moyen est **désactivé** : `createCheckout` renvoie un message clair (« Paiement par carte CIB ou Edahabia indisponible… réglez par BaridiMob, CCP ou virement »), le webhook répond 503.
Stripe exige les deux variables (sans secret de webhook, aucun paiement ne serait confirmé).

## Webhooks à déclarer
- **Chargily** : rien à déclarer, chaque paiement envoie `webhook_endpoint = https://www.mydalil.com/api/paiement/chargily` (preview : `https://preview.mydalil.com/…`, mais la preview est protégée par Vercel : Chargily ne peut pas l’atteindre sans contournement de la protection).
  Signature : en-tête `signature` = HMAC-SHA256 hex du corps brut avec la clé secrète. Évènements traités : `checkout.paid` (reçu), `checkout.failed`, `checkout.canceled` (annulé).
- **Stripe** : Workbench › Webhooks › « Create an event destination » › Your account › Snapshot › évènements `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` › URL `https://www.mydalil.com/api/paiement/stripe` › copier le `whsec_…` dans `STRIPE_WEBHOOK_SECRET`.
  Signature : en-tête `Stripe-Signature`, seuls `t` et `v1` comptent, HMAC-SHA256 de `t.corps_brut`, comparaison en temps constant, tolérance 5 minutes.
- Idempotence : paiement retrouvé par `externalId` (identifiant du checkout / de la session) ; déjà « Reçu » ou « Annulé » → 200 sans effet ; livraisons simultanées : verrou d’une heure. Évènement inconnu ou paiement inconnu → 200.
- Retour client : `/api/paiement/retour?lang=fr|en|ar&etat=ok|echec|annule` (page simple, non indexée). Elle n’active rien : seul le webhook active.

## Tester en mode test
1. Preview ou local avec `CHARGILY_SECRET_KEY=test_sk_…` et/ou `STRIPE_SECRET_KEY=sk_test_…` + `STRIPE_WEBHOOK_SECRET`.
2. Stripe en local : `stripe listen --forward-to localhost:3000/api/paiement/stripe` (donne un `whsec_…` à mettre dans `.env`), puis carte `4242 4242 4242 4242`, date future, CVC quelconque.
3. Chargily : l’URL de webhook doit être publique (production ou tunnel HTTPS) ; payer avec les moyens de test du tableau de bord Chargily.
4. Contrôler dans /admin › Professionnels › Paiements : état « Reçu », date, note « Confirmé par … », puis l’abonnement ou la mise en avant actif.
5. Tests automatiques : `pnpm test src/modules/pros/payments` (signatures, montants, idempotence, reçu manuel).

## Ce que Saïd voit dans /admin
- **Professionnels › Paiements** : chaque paiement (moyen, référence, montant en centimes, devise, état, objet, abonnement ou mise en avant liés, note de suivi : création, confirmation, écart de montant).
- **Reçu hors ligne** : alerte Telegram « Reçu de paiement à contrôler » avec le lien du paiement et le bouton **Confirmer le paiement**. Le justificatif est un document privé (collection des documents de revendication, lecture administrateur seulement ; numéro dans la note du paiement). Confirmer = action `valider_paiement` (Telegram, MCP admin) → « Reçu » + activation + reçu email au membre.
- **Paiement en ligne** : alerte Telegram « Paiement reçu » avec le résultat de l’activation, ou « Alerte paiement » si le montant ne correspond pas.
- Action en lecture : `paiements_en_attente`.

## Pages consultées (19 nov. 2026)
- Chargily : https://dev.chargily.com/pay-v2/api-reference/introduction.md (URL test et live), https://dev.chargily.com/pay-v2/api-reference/authentication.md (`Bearer` + clé secrète), https://dev.chargily.com/pay-v2/api-reference/checkouts/create (champs `amount`, `currency`, `payment_method`, `success_url`, `failure_url`, `webhook_endpoint`, `locale`, `description` ; réponse `id`, `checkout_url`), https://dev.chargily.com/pay-v2/api-reference/checkouts/checkout-object.md (statuts), https://dev.chargily.com/pay-v2/the-quick-guide/create-a-checkout.md (POST `/checkouts`, exemple 2000 dzd), https://dev.chargily.com/pay-v2/webhooks.md (en-tête `signature`, HMAC-SHA256, réponse 200, `checkout.paid`, `checkout.failed`, `checkout.canceled`), https://dev.chargily.com/pay-v2/test-and-live-mode.md.
- Stripe : https://docs.stripe.com/api/checkout/sessions/create (`mode`, `line_items[].price_data`, `unit_amount`, `success_url`, `cancel_url`, `client_reference_id`, `metadata`, `locale`, `customer_email` ; réponse `id`, `url`), https://docs.stripe.com/webhooks (vérification manuelle, `t`/`v1`, tolérance 5 minutes, temps constant, doublons), https://docs.stripe.com/checkout/fulfillment (`checkout.session.completed`, `async_payment_succeeded`, `payment_status`), https://docs.stripe.com/webhooks/signature (dépannage des signatures).
- Non vérifié dans les pages consultées : minimum de montant Chargily, format exact de `metadata` Chargily (non utilisé), traitement des relances Chargily.
