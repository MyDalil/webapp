# DALIL — démarrage de la bêta (preview)

Version testée : branche `agent/noyau-mcp-complet`, puis `preview` après fusion de la PR.
Détails techniques : `docs/mcp.md`, `docs/mcp-oauth.md`, `docs/canaux.md`, `docs/paiements.md`, `docs/agent-handoff.md`.

## 1. Point bloquant à régler d'abord : la protection Vercel

`preview.mydalil.com` est derrière la connexion Vercel. Les bêta-testeurs, Telegram, ChatGPT, Claude, Chargily et Stripe ne peuvent pas l'atteindre.

Choisir une option dans Vercel › projet `mydalil` › Settings › Deployment Protection :
- **Option A (recommandée pour la bêta)** : activer « Protection Bypass for Automation ». Vercel donne un secret. On l'ajoute aux adresses : `?x-vercel-protection-bypass=<secret>&x-vercel-set-bypass-cookie=true` (le cookie garde l'accès ensuite).
- **Option B** : désactiver la protection pour Preview le temps de la bêta. Le site preview n'est pas indexé (robots bloqués hors production).

## 2. Variables Vercel (environnement Preview)

Obligatoires :
- `DALIL_DATABASE_URL` — branche Neon de preview (jamais la base de production).
- `PAYLOAD_SECRET`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY` — comme aujourd'hui.
- `OAUTH_SECRET`, `REMOTE_SIGNING_SECRET` — 32 caractères minimum chacune (obligatoires en production, recommandées en preview).
- `DALIL_MCP_KEYS` — empreintes des clés MCP (voir § 3).
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_USERNAME`.
- `ANTHROPIC_API_KEY` — mode équipe du bot, traductions, texte alternatif. Plafond : `AI_MONTHLY_BUDGET_USD`.

Facultatives :
- `OPENAI_API_KEY` (vocaux ; ou `TRANSCRIBE_PROVIDER=groq` + `GROQ_API_KEY`).
- `TELEGRAM_GROUP_ID` (groupe lié au canal).
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` (après vérification Meta).
- `CHARGILY_SECRET_KEY`, `CHARGILY_MODE=test`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (clés de test seulement en bêta).
- `DALIL_PLUGINS` (absent = `communication` seul), `TRANSLATE_DAILY_MAX`.

## 3. Accès de Rad et Saïd

1. Dans `/admin › Utilisateurs`, vérifier les deux comptes (Saïd : patron ; Rad : admin ou patron).
2. **Telegram** : chacun écrit `/id` au bot, puis colle son identifiant dans son compte `/admin` (champ « Identifiant Telegram »).
3. **Clé MCP** (Claude Code, Claude Desktop) : `node scripts/mcp-key.mjs email@du-compte`. La clé s'affiche une seule fois ; seule l'empreinte va dans `DALIL_MCP_KEYS`.
4. Configuration à coller dans Claude Desktop / Claude Code (remplacer l'adresse et la clé) :

```json
{
  "mcpServers": {
    "dalil-admin": {
      "type": "http",
      "url": "https://<adresse-preview>/api/mcp/admin?x-vercel-protection-bypass=<secret>",
      "headers": { "Authorization": "Bearer dalil_<votre-clé>" }
    },
    "dalil": {
      "type": "http",
      "url": "https://<adresse-preview>/api/mcp?x-vercel-protection-bypass=<secret>"
    }
  }
}
```

5. **claude.ai / ChatGPT** : ajouter un connecteur personnalisé avec l'adresse `https://<adresse-preview>/api/mcp/admin` ; la connexion se fait par OAuth avec le compte `/admin` (voir `docs/mcp-oauth.md`). ChatGPT : mode développeur.
6. Brancher le webhook Telegram : connecté à `/admin`, ouvrir `/api/telegram/setup`.

Règle : par MCP, Telegram ou WhatsApp, tout est créé en brouillon. La publication se fait par un clic sur un bouton signé ou dans `/admin`.

## 4. Test en 3 minutes

**Saïd (Telegram, compte équipe)**
1. Envoyer `/aide` : la liste des commandes s'affiche.
2. Envoyer « Ajoute la pharmacie X à Hydra, 021 00 00 00 » : un brouillon est créé avec [Publier] [Corriger] [Rejeter].
3. Cliquer [Publier] : la fiche apparaît sur le site.
4. Envoyer `/etat` : l'état du site s'affiche.

**Bêta-testeur (Telegram, visiteur)**
1. Envoyer « Bonjour » : 3 boutons apparaissent, sans IA.
2. [Chercher un établissement] → wilaya → rubrique → 3 fiches avec liens.
3. [Inscrire mon activité] → 4 questions → lien `/finaliser` vers le site.

**Site (téléphone)**
1. Ouvrir une fiche : boutons Appeler / WhatsApp / Itinéraire / Partager.
2. Installer le site (« Ajouter à l'écran d'accueil ») puis couper le réseau : la fiche consultée reste lisible.
3. `/inscrire` : parcours pro jusqu'à « En attente de validation ».

**Admin**
- `/admin` : cases À relire, Revendications, Abonnements, Photos ; `/admin/validation` : tout ce qui attend une décision ; `/admin/import` : import CSV ; `/admin/controle` : contrôle de sécurité.

## 5. Avant la bêta : base de données

Les 4 migrations du 19 nov. sont additives. Les passer d'abord sur une branche Neon copiée de la production (le build de preview le fait seul sur la branche Neon de preview).
