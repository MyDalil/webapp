# Recherche & Assistant

Département responsable : **Data, Search & AI**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
La recherche du site, la recherche guidée (y compris lecture de PDF) et l’assistant.

## Contenu du module
- `ui/HomeSearch` (accueil), `ui/GuidedSearch` (lecture PDF via pdfjs), `ui/Assistant` (barre « Demandez à DALIL ») ; page /recherche.
- `sitemap.ts` — plan du site dynamique (`/sitemap.xml`, `/sitemaps/*.xml`) et règles de `/robots.txt` : contenus publiés seulement, pages privées exclues.
- **Index commun** (`search_index`, Neon, socle `platform/search/`) : une ligne par rubrique, catégorie et sous-catégorie (annuaire, spécialités, services et activités, annonces et types), adresse, praticien, prestataire, annonce, guide. Sans accent, plein texte français par préfixes, fautes tolérées (trigrammes). Chaque métier écrit ses lignes (`modules/<m>/search.ts`, hooks à chaque enregistrement) ; reconstruction complète après chaque déploiement (`pnpm search:index`) et chaque jour (`/api/taches`).
- `results.ts` — `searchEverything` (page /recherche, une requête par groupe) et `suggest` (`/api/recherche`, propositions pendant la frappe) ; `place.ts` — lieu reconnu dans la phrase (wilaya prioritaire sur une commune homonyme), testé.
- Référencement : pages `/annuaire/<secteur>/<catégorie>` et `/annuaire/<secteur>/<catégorie>/<wilaya>` (fichier `categories` du plan du site ; une combinaison sans adresse n’est pas indexée).
- `intent.ts` — compréhension d’une demande : brouillon nettoyé, page à ouvrir pré-remplie (services, praticiens, annuaire, recherche), une question si une information indispensable manque. Valeurs de l’IA revérifiées contre les référentiels ; repérage par mots-clés sans IA. Route `/api/ia/demande`.

## Dépend de
`contenus`, `annuaire`, `sante`, `services`, `annonces` (plan du site) ; à venir : index commun.

## Événements
Aucun.

## Règles propres
- La barre ne fait jamais d’action à la place de la personne : elle ouvre une page pré-remplie, la personne choisit et valide.
- Rien d’ambigu n’est deviné : une question, ou le filtre reste vide.
- L’assistant cite toujours la source et ne masque jamais l’origine d’une information.
- En cas de doute : renvoyer vers la source officielle ou l’équipe.

## Accès
Aucun pour l’instant.

## Prochaines étapes
- Index de recherche sur les contenus vérifiés (Postgres plein texte, puis sémantique).
- Assistant avec citations.

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
