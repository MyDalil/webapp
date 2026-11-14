# Agents (équipe IA)

Département responsable : **CEO Office**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
L'équipe d'agents IA de DALIL, organisée en dossiers (méthode ICM, `company/` à la racine) : 8 départements, 16 rôles — 6 actifs (CEO, Rédacteur, Traducteur, Médiathèque, Modérateur, Support), 10 en réserve activables en un clic. Ils proposent. Un humain publie.

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
- `company/` (racine du dépôt) — la société en fichiers : `AGENTS.md` (L0), `CONTEXT.md` (routage), `_config/`, `departements/<nn>/agents/<rôle>/{id.json, guardrails.json, AGENT.md}`, `workflows/<nn>/<nn-étape>/CONTEXT.md`.
- `policy.ts` — autonomie (exécute / propose / refus), plancher codé.
- `AgentNotifications.ts`, `notify.ts` — fil d’activité avant / pendant / après / ordre.
- `runtime/` — moteur : `company.ts` (lecture ICM), `llm.ts` (Anthropic, OpenAI, coût), `engine.ts` (boucle d’étapes, arrêt coopératif, budgets), `tools.ts` (outils réels), `queue.ts` (file, verrou), `activation.ts` (test à froid).
- Routes : `/api/agents/run` (file : CRON_SECRET ou admin), `/api/agents/role` (activer, remettre en réserve).

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
