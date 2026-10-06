# Recherche & Assistant

Département responsable : **Data, Search & AI**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
La recherche du site, la recherche guidée (y compris lecture de PDF) et l’assistant.

## Contenu du module
- `ui/HomeSearch` (accueil), `ui/GuidedSearch` (lecture PDF via pdfjs), `ui/Assistant` (bulle d’aide) ; page /recherche.

## Dépend de
`contenus`, `annuaire` (à venir : index commun).

## Événements
Aucun.

## Règles propres
- L’assistant cite toujours la source et ne masque jamais l’origine d’une information.
- En cas de doute : renvoyer vers la source officielle ou l’équipe.

## Accès
Aucun pour l’instant.

## Prochaines étapes
- Index de recherche sur les contenus vérifiés (Postgres plein texte, puis sémantique).
- Assistant avec citations.

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
