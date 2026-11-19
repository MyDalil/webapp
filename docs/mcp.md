# DALIL en MCP — le site et les IA appellent les mêmes fonctions

Chaque rubrique expose ses **actions** (`src/modules/<m>/actions.ts`), réunies dans `src/registry.ts`.
Les pages les appellent en direct (`callAsSite`), les IA par le protocole MCP (transport « Streamable HTTP », sans état, réponses JSON).

## Adresses

| Serveur | URL | Accès | Outils |
|---|---|---|---|
| Public | `https://www.mydalil.com/api/mcp` | aucun compte | lecture seule, données publiées seulement |
| Équipe | `https://www.mydalil.com/api/mcp/admin` | clé API nominative ou OAuth | selon le rôle du compte (patron, admin, editor) |

Paramètre facultatif `?lang=en` ou `?lang=ar` : les liens renvoyés pointent vers la page dans cette langue.
Versions du protocole : `2025-06-18` (par défaut) et `2025-03-26`. `GET` renvoie 405 (pas de flux serveur).

## Outils

Publics (lecture seule) : `rechercher`, `lister_rubriques`, `chercher_lieu`, `chercher_ecole`, `voir_fiche`,
`chercher_praticien`, `voir_praticien`, `creneaux_praticien`, `chercher_prestataire`, `voir_prestataire`,
`chercher_annonce`, `voir_annonce`, `chercher_demarche`, `voir_demarche`, `chercher_consulat`.

Équipe : les outils publics, plus `creer_brouillon_lieu` et `modifier_brouillon` (patron, admin, editor — toujours
un brouillon « À vérifier »), et les actions d’équipe des autres lots (import CSV, contrôle de sécurité…) selon le rôle.

**Jamais par MCP : `publier_fiche`, `rejeter_fiche` ni aucune action d’administration qui écrit** (`access: 'admin'`
et non `readOnly` : newsletter, publication sur le canal, restaurations…). La route `/api/mcp/admin` les retire de
`tools/list` et `tools/call` les refuse (« Outil inconnu »), même pour un compte patron ou admin. Publier ou refuser
une fiche se fait seulement :
- dans `/admin` ;
- par le clic signé d’un compte patron ou admin sur le bouton envoyé par la télécommande (Telegram, WhatsApp).
Une IA prépare ; un humain identifié publie.

Chaque outil porte les annotations MCP `readOnlyHint`, `destructiveHint: false`, `openWorldHint: false`.

## Brancher DALIL

### Claude (claude.ai, application) — connecteur personnalisé
Réglages › Connecteurs › Ajouter un connecteur personnalisé :
- grand public : URL `https://www.mydalil.com/api/mcp` ;
- équipe : URL `https://www.mydalil.com/api/mcp/admin` ; Claude découvre la connexion OAuth
  par l’en-tête `WWW-Authenticate` (`/.well-known/oauth-protected-resource`) et ouvre la page de connexion DALIL.

### ChatGPT
1. Réglages › Applications et connecteurs › Paramètres avancés › activer le **mode développeur**.
2. Créer un connecteur avec l’URL du serveur (public, ou équipe avec OAuth).
3. Pour le grand public : soumettre le serveur public au répertoire des applications ChatGPT
   (description, captures, politique de confidentialité de mydalil.com) ; seul le serveur public est soumis.

### Claude Desktop / Claude Code — clé API
1. Générer la clé : `node scripts/mcp-key.mjs prenom@mydalil.com` (le compte doit exister dans /admin › Users).
2. Ajouter la ligne affichée à la variable Vercel `DALIL_MCP_KEYS` (lignes `email:sha256` séparées par des virgules), puis redéployer.
3. Remettre la clé en clair à son titulaire, une seule fois.
4. Claude Code : `claude mcp add --transport http dalil-admin https://www.mydalil.com/api/mcp/admin --header "Authorization: Bearer dalil_…"`.
   Claude Desktop : même URL et même en-tête dans la configuration du serveur distant.

## Sécurité

- Le serveur public ne liste et n’exécute que les outils `access: 'public'` **et** `readOnly`.
- Données : un visiteur ne voit que le publié ; jamais d’email, de note interne ni de donnée privée de membre.
  Le téléphone d’une adresse n’apparaît que si la fiche le rend public (`showContacts`, règle appliquée par Payload).
- Rôle relu en base à chaque appel : un compte rétrogradé ou supprimé perd ses droits aussitôt.
  **Révoquer une clé = retirer sa ligne de `DALIL_MCP_KEYS`** (seule l’empreinte SHA-256 est stockée, comparée en temps constant).
- Une écriture venue de MCP, Telegram, WhatsApp ou d’une tâche planifiée crée un brouillon : les champs de publication
  sont retirés. Publier à distance exige un compte patron ou admin identifié et un clic sur un bouton signé
  (Telegram, WhatsApp) ; le MCP ne publie jamais.
- Prouvé en CI par `e2e/mcp.spec.ts`, `e2e/oauth.spec.ts` et `e2e/telegram.spec.ts` (clé de test générée par la CI).
- Chaque écriture prévient l’équipe sur Telegram avant et après (même `actionId`) et laisse une ligne au journal d’audit
  (outil noté `mcp · <action>`). Limite de débit : 120 requêtes/min (public), 60 (équipe), par adresse IP.
- Aucun secret dans le code : clés et jetons uniquement dans les variables Vercel.
