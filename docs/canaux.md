# Piloter DALIL par Telegram et WhatsApp — mise en place

Pour Rad et Saïd. Telegram et WhatsApp sont des télécommandes : ils appellent les actions de DALIL, ils ne décident rien seuls.
Toute écriture crée un **brouillon**. Publier = clic sur **[Publier]** par un compte patron ou admin.
Saïd a priorité sur Rad en cas d’ordres contraires.

## Ce que fait la télécommande
- **Équipe** (compte /admin relié) : texte, vocal ou photo. Commandes : `/chercher`, `/fiche`, `/brouillon`, `/publier ID`, `/rejeter ID motif`, `/corriger ID correction`, `/csv` (fichier joint), `/controle`, `/newsletter`, `/traduire`, `/restaurer`, `/defi <wilaya> <thème>`, `/aide`. Un message sans commande est compris par l’IA (Claude Haiku, plafond IA du site).
- **Photo** (équipe) : la photo part dans Médias « À contrôler » ; le texte lisible (nom, adresse, téléphone, horaires) devient un brouillon de fiche. Rien n’est inventé : ce qui est illisible reste vide.
- **Vocal** : transcrit puis traité comme un texte (clé OpenAI nécessaire).
- **Visiteur** (numéro ou compte inconnu) : distributeur fermé, **sans IA, jamais**. Voir « Bot public » ci-dessous.
- **Groupe de discussion du canal** : le bot répond seulement si on le mentionne (@nom_du_bot) ou avec `/chercher`, par un bouton « Discuter avec DALIL » qui ouvre la conversation privée (`t.me/<bot>?start=chercher`). Aucune recherche ni écriture dans le groupe, même pour l’équipe.

## Bot public (visiteurs)
Tout message ou `/start` → message fixe + 3 boutons : **[Chercher un établissement] [Inscrire mon activité] [Ouvrir mydalil.com]**. Français par défaut ; anglais ou arabe si la langue de l’appareil Telegram l’indique (WhatsApp : arabe si le message est écrit en arabe).
- **Chercher** : wilaya (Alger, Oran, Sétif, Constantine, Tizi Ouzou, Blida + « Autre wilaya » → nom ou numéro, contrôlé contre les 69 wilayas et leurs variantes) → rubrique (référentiel) → 3 fiches publiées avec leur lien, puis [Autres résultats sur le site] [Nouvelle recherche].
- **Inscrire mon activité** : 4 questions (nom → activité, rubrique ou saisie → wilaya → téléphone algérien ou international). Réponse non valide : la même question revient avec un exemple. À la fin : **brouillon** de fiche (rien n’est publié, note interne « Déclaré via le bot »), message à Rad et Saïd avec [Publier] [Rejeter], et lien « Finaliser ma fiche » signé (7 jours) vers `/finaliser`.
- Liens directs : `t.me/<bot>?start=chercher` et `t.me/<bot>?start=inscrire` lancent le parcours. Chaque publication du canal porte le bouton « Discuter avec DALIL » si `TELEGRAM_BOT_USERNAME` est réglé.
- **Limites** : 10 messages par minute et 30 par jour par expéditeur ; au-delà, un seul message « Limite atteinte pour aujourd’hui. Consultez mydalil.com », puis silence. 3 inscriptions par jour au plus. Vocal, photo, fichier d’un visiteur : « Les messages vocaux et les fichiers ne sont pas pris en charge. Utilisez les boutons. » (rien n’est téléchargé).
- Parcours en cours gardé 30 minutes (collection `bot-sessions`) ; au-delà, retour au menu.

## Telegram

### 1. Créer le bot (Saïd ou Rad, une fois)
1. Dans Telegram, ouvrir **@BotFather** → `/newbot` → nom « DALIL » → identifiant se terminant par `bot`.
2. BotFather donne un **jeton**. Ne pas le partager. Le coller dans Vercel : variable `TELEGRAM_BOT_TOKEN` (Production et Preview).
3. Dans BotFather : `/setprivacy` → choisir le bot → **Enable** (le bot ne lit dans les groupes que les messages qui le mentionnent et les commandes).
4. Facultatif : `/setcommands` → coller :
   ```
   chercher - Chercher un établissement
   inscrire - Inscrire mon activité
   ```

### 2. Brancher le webhook
1. Vercel : variable `TELEGRAM_WEBHOOK_SECRET` = une longue phrase aléatoire (lettres, chiffres, `_` et `-` seulement).
2. Variable `REMOTE_SIGNING_SECRET` = une autre phrase aléatoire de **32 caractères au moins** (signe les boutons). **Obligatoire en production** : sans elle, aucun bouton (message « Boutons désactivés ») et alerte dans Erreurs du site. En preview et en local, `PAYLOAD_SECRET` sert à défaut.
3. Redéployer, puis dans /admin ouvrir `/api/telegram/setup` (compte admin) et brancher le webhook. Telegram signe chaque appel : sans le bon secret, refus.

### 3. Relier les comptes de l’équipe
1. Chacun écrit `/id` au bot en privé : le bot répond **l’identifiant Telegram**.
2. /admin › Utilisateurs › son compte › champ **Identifiant Telegram** → coller → enregistrer.
3. Réécrire `/aide` au bot : il répond « Salam … » avec les commandes de l’équipe.

### 4. Canal et groupe de discussion
1. Le canal DALIL reste un canal : seul Saïd y publie.
2. Dans le canal : Paramètres › **Discussion** › créer ou lier un groupe de discussion.
3. Ajouter le bot au **canal** comme administrateur (droit « Publier des messages ») et au **groupe** comme membre.
4. Identifiant du canal : /admin › Commandes › « Canal Telegram » (déjà en place).
5. Identifiant du groupe : écrire un message dans le groupe, puis le transférer à **@RawDataBot** (ou équivalent) pour lire `chat.id` (commence par `-100`). Le mettre dans Vercel : `TELEGRAM_GROUP_ID`. Sans cette variable, le bot ignore tous les groupes.
6. `TELEGRAM_BOT_USERNAME` (sans @) : nom du bot. Nécessaire pour le bouton « Discuter avec DALIL » des publications du canal ; évite aussi un appel à Telegram.

### 5. Défi wilaya
`/defi Oran pharmacies de garde` (patron ou admin) prépare un brouillon dans /admin › Publications Telegram. Le bouton **[Publier]** programme l’envoi sur le canal ; la garde existante s’applique (Saïd seul).

### Arrêt
/admin › Commandes : « Bot Telegram actif » décoché ou « Tout couper » → le bot se tait et ne prévient plus personne.

Depuis la télécommande (19 nov. 2026, actions `etat_du_site`, `arreter_le_site`, `relancer_le_site` de `src/platform/controls/actions.ts`) :
- `/etat` (équipe) : arrêt général, agents, Telegram, maintenance, IA (clé, dépense du mois / budget), dernière sauvegarde réussie, erreurs non résolues des 24 h.
- `/finir [raison]` (patron, admin) : arrêt « finir puis arrêter » ; `/relancer` : lever l’arrêt. Les deux demandent le bouton **[Confirmer]** signé. « Tout couper » reste dans /admin (il couperait la télécommande). Un arrêt n’est jamais adouci à distance, et un arrêt déclenché par le patron ne peut être levé que par un compte patron.

### Boutons signés
- Validité 7 jours (« Bouton expiré. »), usage unique (« Déjà utilisé. », clé = signature dans `rate_limits`).
- [Publier] : refusé si la fiche a été modifiée après l’envoi du bouton (« Fiche modifiée depuis : rouvrez-la. »).
- Panne imprévue : l’expéditeur reçoit « Erreur, réessayez. », l’erreur est enregistrée et la clé d’anti-doublon du message est libérée.

## WhatsApp (WhatsApp Cloud API, Meta)

### 1. Prérequis
1. Un **numéro dédié** à DALIL, jamais utilisé dans l’application WhatsApp (ou retiré d’elle avant).
2. Un compte **Meta Business** (business.facebook.com) au nom de l’entreprise, puis la **vérification d’entreprise** (documents officiels ; quelques jours).
3. developers.facebook.com › Créer une application › type **Business** › ajouter le produit **WhatsApp** › ajouter le numéro dédié et le valider par SMS.

### 2. Variables Vercel
| Variable | Où la trouver |
|---|---|
| `WHATSAPP_TOKEN` | Meta Business › Utilisateurs système › générer un jeton **permanent** (droits `whatsapp_business_messaging`, `whatsapp_business_management`) |
| `WHATSAPP_PHONE_NUMBER_ID` | Application › WhatsApp › Configuration de l’API › « Identifiant du numéro de téléphone » |
| `WHATSAPP_APP_SECRET` | Application › Paramètres › Général › « Clé secrète » |
| `WHATSAPP_VERIFY_TOKEN` | à inventer (longue phrase aléatoire), recopiée à l’étape 3 |

Il manque une variable : `/api/whatsapp` répond 503 et rien n’est envoyé.

### 3. Webhook
1. Application › WhatsApp › Configuration › Webhook : URL `https://www.mydalil.com/api/whatsapp`, jeton de vérification = `WHATSAPP_VERIFY_TOKEN`.
2. S’abonner au champ **messages**.
3. Chaque appel de Meta est signé (`X-Hub-Signature-256`) ; une signature fausse est refusée.

### 4. Relier les comptes de l’équipe
/admin › Utilisateurs › son compte › **Numéro WhatsApp** au format international : `+213…` ou `+33…`.

### 5. Coût
Meta facture les conversations selon le pays et la catégorie du message. Les réponses envoyées dans les 24 h qui suivent un message reçu (cas de la télécommande) sont en principe gratuites ; les messages envoyés à l’initiative de DALIL hors de cette fenêtre sont payants et exigent un modèle validé par Meta. Vérifier la grille tarifaire en vigueur sur le site de Meta avant l’ouverture au public.

## Vocal et IA
- `OPENAI_API_KEY` : transcription des vocaux (modèle `gpt-4o-mini-transcribe`). Sans clé : « Vocal non disponible, écrivez votre message. »
- `ANTHROPIC_API_KEY` : compréhension du langage naturel (équipe seulement ; un visiteur n’appelle jamais l’IA ni la transcription), dans le plafond IA mensuel (`AI_MONTHLY_BUDGET_USD`) ; usage visible dans /admin › Pilotage › Usage IA (« channel »). Sans clé ou au plafond : commandes seulement.
