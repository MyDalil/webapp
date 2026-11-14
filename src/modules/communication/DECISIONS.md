# Décisions — Communication

Format : `- AAAA-MM-JJ — décision — raison`. Ne jamais réécrire une entrée : en ajouter une nouvelle qui la remplace.

- 2026-10-06 — module créé lors de la réorganisation par métiers — chaque métier évolue indépendamment avec sa mémoire.
- 2026-10-06 — double confirmation + désinscription en un clic (RFC 8058) — exigences CNIL et Gmail/Yahoo.
- 2026-11-14 — bot Telegram (lot 4 du cockpit) : liste blanche = comptes patron et admin dont l’« Identifiant Telegram » correspond ; un inconnu ne reçoit que son identifiant (/start). Chaque commande passe par les droits réels du compte : l’ordre de Saïd l’emporte, seul Saïd publie sur le canal (garde existante).
- 2026-11-14 — un message sans commande devient une tâche pour le CEO (origine patron ou équipe) ; le webhook répond toujours 200 pour éviter les renvois en boucle de Telegram.
- 2026-11-14 — publication sur le canal : immédiate si la date est vide ou passée (après la réponse), sinon à échéance (`/api/agents/run`, tâche quotidienne). Sans jeton ou sans canal réglé : « Échec d’envoi » avec la cause, jamais « Publiée ».
- 2026-11-14 — canal Telegram (revue du lot 11) : dès qu’un message est programmé, son contenu et sa date sont figés pour tout autre que Saïd ; l’envoi est réservé en une seule requête SQL (pas de double publication) ; un même `update_id` du webhook n’est traité qu’une fois (48 h).
