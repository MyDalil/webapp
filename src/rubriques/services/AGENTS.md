# Rubrique — Services

## Rôle
Santé avec rendez-vous, services à domicile, professionnels vérifiés.

## Pages
- `/services`
- `/praticiens`

## Modules de code
sante, services, annuaire (voir `src/modules/<module>/AGENTS.md`).

## Règles de la rubrique
- La vérification DALIL est indépendante de tout abonnement (module confiance).

## Catégories (un dossier chacune)
- `sante-praticiens/` — Santé : prendre rendez-vous
- `services-a-domicile/` — Services à domicile
- `maison-travaux/` — Maison & travaux
- `droit-finance-conseil/` — Droit & finance
- `transports-mobilite/` — Transports & mobilité

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

Décisions : `DECISIONS.md`. Sources : `SOURCES.md`.
