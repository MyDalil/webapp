# Serveur MCP DALIL et OAuth

## OAuth

Le serveur MCP admin (`https://www.mydalil.com/api/mcp/admin`) accepte uniquement un jeton OAuth 2.1 délivré à un compte de l’équipe (`/admin`, rôles patron, administrateur ou rédacteur ; le conseiller est refusé). Aucun jeton n’est stocké : tout est signé (HS256, clé dérivée par HKDF).

### Relier claude.ai (Rad, Saïd)
1. claude.ai › Paramètres › Connecteurs › Ajouter un connecteur personnalisé.
2. Adresse : `https://www.mydalil.com/api/mcp/admin`. Laisser vides les champs « client ID / secret » (inscription automatique).
3. Cliquer sur « Se connecter ». Si vous n’êtes pas connecté à `/admin`, la page de connexion DALIL s’ouvre d’abord.
4. Écran « Autoriser l’accès à DALIL » : vérifier le compte affiché et « Retour vers : claude.ai », puis **Autoriser**.

### Relier ChatGPT
1. ChatGPT › Paramètres › Applications et connecteurs › (mode développeur) › Créer.
2. URL du serveur MCP : `https://www.mydalil.com/api/mcp/admin` ; authentification : OAuth.
3. Même écran d’autorisation ; « Retour vers » doit indiquer chatgpt.com (ou chat.openai.com).

N’autorisez jamais une demande que vous n’avez pas lancée vous-même : le nom de l’application est déclaré par elle et n’est pas vérifié.

### Durées
- Code d’autorisation : 5 minutes, usage unique.
- Jeton d’accès : 1 heure, valable seulement pour `/api/mcp/admin`.
- Jeton de rafraîchissement : 30 jours, usage unique, remplacé à chaque renouvellement. **Réutilisation détectée** (ou code rejoué) : toute la famille de jetons de cette connexion est révoquée (clé `oauth-fam` dans `rate_limits`, 30 jours) ; les jetons d’accès de la famille sont refusés aussitôt ; il faut relier à nouveau le connecteur.

### Révoquer
- **Un compte** : changer son mot de passe dans `/admin` (ou lui donner le rôle conseiller, ou supprimer le compte). Tous ses jetons cessent de fonctionner immédiatement.
- **Tout le monde** : dans Vercel › mydalil › Settings › Environment Variables, changer `OAUTH_KEY_VERSION` (par exemple `1` → `2`) puis redéployer. Tous les clients inscrits et tous les jetons deviennent invalides ; chacun doit relier à nouveau son connecteur.
- `POST /api/oauth/revoke` répond toujours 200 mais ne révoque rien en particulier (pas de table) : le jeton d’accès expire au plus tard en 1 heure.
- Retirer aussi le connecteur dans claude.ai ou ChatGPT.

### Variables d’environnement
- `OAUTH_SECRET` (au moins 32 caractères aléatoires) : **obligatoire en production** (`VERCEL_ENV=production`), sans repli ; sans lui, OAuth répond 503 avec le motif et une alerte apparaît dans Erreurs du site. En preview et en local : à défaut `PAYLOAD_SECRET`, puis secret dérivé de l’URL de la base. Le changer invalide tout, comme `OAUTH_KEY_VERSION`.
- `OAUTH_KEY_VERSION` (défaut `1`).
- Émetteur : `https://www.mydalil.com` en production, `https://preview.mydalil.com` en preview (`NEXT_PUBLIC_SITE_URL` sinon).

### Adresses
- `/.well-known/oauth-protected-resource` et `/.well-known/oauth-protected-resource/api/mcp/admin` (RFC 9728) : même réponse (`protectedResourceResponse`). L’en-tête 401 de `/api/mcp/admin` (`wwwAuthenticate(oauthConfig())`) pointe vers la seconde, sur l’émetteur de l’environnement (preview testable).
- `/.well-known/oauth-authorization-server` (RFC 8414).
- `POST /api/oauth/register` (RFC 7591 ; adresses de retour : https sur claude.ai, claude.com, chatgpt.com, chat.openai.com ; http sur localhost ou 127.0.0.1).
- `/oauth/autoriser` (consentement), `POST /api/oauth/autoriser` (décision, protégée contre CSRF).
- `POST /api/oauth/token` (authorization_code avec PKCE S256, refresh_token), `POST /api/oauth/revoke`.
- Limites de débit : inscription 20/h, jeton 60/10 min, consentement 30/10 min par adresse IP.
- MCP (`src/app/api/mcp/limits.ts`) : public 600 unités/min par IP (requête + chaque `tools/call`) ; admin 600 requêtes/min par IP avant authentification, puis 120 unités/min par compte ; lots de 10 messages au plus.
