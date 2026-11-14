# Décisions — Agents

Format : `- AAAA-MM-JJ — décision — raison`. Ne jamais réécrire une entrée : en ajouter une nouvelle qui la remplace.

- 2026-10-17 — trois agents au départ (CEO, Editorial, Trust) — coût et risque d'échec réduits ; les autres viendront avec le volume.
- 2026-10-17 — tâches et messages dans Neon, exécution par la file de jobs Payload, arrêt coopératif avant chaque étape — Saïd met en pause, modifie ou annule sans nouveau fournisseur.
- 2026-10-17 — rôle `patron` pour Saïd ; ses ordres l'emportent — décision de Rad.
- 2026-10-17 — Vie musulmane interdite aux agents, vérifiée côté serveur — décision de Rad.
- 2026-10-17 — les agents n'écrivent jamais dans les contenus : ils déposent une proposition à valider — un humain publie.
- 2026-11-14 — autonomie en mode mixte (décision de Rad) : `policy.ts` → lecture, traduction, textes alt, étiquettes, liens cassés exécutés seuls (notifiés) ; fiches, emails, Telegram, annonces proposés. Réglage par outil dans Neon (`toolModes`). Plancher codé jamais levé : supprimer, payer, publier sans validation, déployer, changer les droits, Vie musulmane, arrêt général.
- 2026-11-14 — notifications avant / pendant / après / ordre à chaque changement d’état d’une tâche (`agent-notifications`, canaux réglés dans Commandes) ; la ligne s’écrit dans la transaction de la tâche, les envois Telegram/email partent après la réponse (`after`) — jamais d’appel externe pendant une transaction.
- 2026-11-14 — erreur évitée : `mail.send()` renvoie `false` sans lever d’erreur ; un état d’envoi se déduit de sa valeur (accepté / échec / non configuré), jamais du simple fait que la promesse se résout.
- 2026-11-14 — organisation ICM (Van Clief & McDermott, arXiv 2603.16021) : `company/` remplace `equipe/` ; 16 rôles, 6 actifs, 10 en réserve. Un seul exécuteur occupe le bon dossier à la demande : le coût suit les tâches, pas la taille de l’équipe.
- 2026-11-14 — corrections d’ICM pour la production : travail en cours dans Neon (Vercel ne peut pas écrire ses fichiers), traçabilité par `action_id`, versions par Git et Payload, contenu entrant traité comme donnée.
- 2026-11-14 — le moteur agit sous l’identité de l’agent (`createLocalReq`) : les garde-fous existants s’appliquent tels quels ; l’agent termine en « À valider », jamais « Terminée ».
- 2026-11-14 — erreur évitée : verrou Postgres de session (`pg_advisory_lock`) via un pool → déverrouillage possible sur une autre connexion, verrou orphelin. Remplacé par une ligne `agent_run_lock` prise en une requête atomique, qui expire seule.
- 2026-11-14 — budget global vide (Commandes) = aucun agent ne travaille (règle existante, appliquée par le moteur). Tarif d’un modèle sans prix vérifié = estimation prudente haute, signalée.
- 2026-11-14 — outils `translate`, `suggest-tags`, `fix-broken-links`, `web-search` : « non branché » tant que leur écran n’existe pas — jamais de succès simulé.
