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
