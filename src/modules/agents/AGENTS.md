# Agents (équipe IA)

Département responsable : **CEO Office**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
L'équipe d'agents IA de DALIL : CEO, Editorial, Trust au départ. Ils proposent. Un humain publie.

## Gouvernance (décisions de Rad, 17 oct. 2026)
- Saïd est le patron (rôle `patron`). Le CEO lui rend compte de tout.
- Saïd et Rad voient tout, à tout moment. Ils donnent des directives, modifient, mettent en pause, annulent.
- Ordres contraires : l'ordre de Saïd l'emporte. Le code refuse qu'un autre humain modifie une tâche ordonnée par Saïd.
- Vie musulmane : 100 % Saïd. Aucun agent n'y travaille. Refus dans le code (`touchesForbidden`).
- Agents à la demande : événements du site, ordres, quelques tâches planifiées. Jamais en boucle.
- Fournisseurs : Anthropic et OpenAI. Mémoire, skills et outils indépendants du modèle.

## Contenu du module
- `Agents.ts` — un compte par agent, clé API propre, rubriques et outils autorisés, budget, mémoire résumée.
- `AgentTasks.ts` — file de travail. États : nouvelle, en cours, en pause, à valider, terminée, annulée, échec.
  Un agent ne peut ni valider, ni annuler, ni mettre en pause. Il ne touche pas aux champs humains.
- `AgentMessages.ts` — fil des échanges (agents entre eux, agents ↔ Saïd et Rad). Ajout seul. Auteur signé par la session.
- `referentiel.ts` — rubriques, outils, états, mots interdits.
- `equipe/<agent>/AGENT.md` — mission et règles de chaque agent. `equipe/_commun/` — règles de tous.

## Dépend de
`platform/access`, `platform/controls` (arrêt général), `platform/audit`.

## Règles propres
- Les agents ne publient jamais. Ils écrivent une proposition (`proposal`) dans leur tâche.
- Les agents ne se parlent jamais en direct : tout passe par `agent-messages` dans Neon.
- Avant chaque étape : relire la tâche (directive, état) et l'arrêt général (`agentsMayRun`).
- Budget : plafond global (Commandes) + plafond par agent + plafond par tâche. Dépassement = arrêt.

## Accès
Neon (lecture/écriture de ses tâches et messages), Payload par clé API. Pas de Vercel, pas de GitHub.

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
