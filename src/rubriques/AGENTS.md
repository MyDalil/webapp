# Rubriques — mémoire et garde-fous par section

Un dossier par rubrique du menu, et un sous-dossier par catégorie. Chaque dossier contient :
- `AGENTS.md` : rôle, pages, sources autorisées, garde-fous propres ;
- `DECISIONS.md` : journal daté des décisions et des erreurs à ne pas refaire ;
- `SOURCES.md` : sources vérifiées (URL, date, ce qu’elles prouvent) ;
- `CLAUDE.md` : importe `AGENTS.md` (adaptateur Claude ; tout autre agent lit `AGENTS.md`).

Ordre de lecture pour un agent : `AGENTS.md` racine → ce fichier → rubrique → catégorie → module de code concerné.
Un agent travaille seulement dans sa catégorie, avec ses sources.

Ordre des rubriques (menu, portes, accueil) : Vie musulmane, Services, Découvrir, Démarches, Annonces, Vivre en Algérie, Plus.

## Garde-fous communs (toujours)
- Lire aussi `AGENTS.md` à la racine et `src/rubriques/AGENTS.md`.
- Ne jamais inventer une information. Un fait sans source officielle et sans date ne s’affiche pas comme vrai.
- « À vérifier » est un statut interne (équipe, /admin). Il ne s’affiche jamais aux visiteurs.
- Pas de compteurs ni de chiffres internes dans les listes publiques.
- Chaque section a un titre et un petit texte. Titres courts, phrases courtes.
- Images : vraies photos du sujet, même format dans toute la catégorie. Jamais la photo d’un autre lieu.
- Pictogrammes en couleur de la rubrique.
- Tout existe en français, anglais et arabe (1:1). Noms, adresses et horaires jamais traduits.
- Interdits partout : lieux qui servent de l’alcool, écoles ou instituts de musique, zaouïas (même rangées en mosquées), écoles coraniques soufies ou chiites.
- Données dans Neon (collections Payload), jamais dans ces fichiers. Ici : règles, sources, décisions.
