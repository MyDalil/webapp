# Annuaire & Lieux

Département responsable : **Product & UX + Editorial**. Lire aussi `AGENTS.md` à la racine (règles communes).

## Rôle
Les adresses de DALIL : fiches, secteurs, carte, pages /annuaire, /annuaire/[secteur], /adresses/[slug].

## Contenu du module
- Collection `places` (Adresses) — `Places.ts`, champs Fiche / Localisation / Contacts & horaires ; l’onglet Vérification vient de `confiance`.
- `queries.ts` : lecture des fiches publiées (brouillons via Aperçu), position exacte ou approximative (centre-ville).
- `listings.ts/json` : 10 adresses reprises du prototype (seed initial).
- `ranking.ts` : règle de classement écrite (vérification > complétude > patrimoine > notoriété), calculée à chaque enregistrement, jamais liée à un paiement.
- `data/` : import des lieux depuis des sources ouvertes —
  - `open-places.json` : jeu brut (Wikidata CC0 + photos Commons + notes Wikipédia internes), produit par `scripts/import/fetch-places.mjs` via l’action GitHub « Import des lieux » ;
  - `descriptions-*.json` : textes DALIL rédigés à partir des faits (jamais copiés) ;
  - `open-places-selected.json` : lot publiable (`node scripts/import/select-places.mjs`) = photo libre + texte DALIL, doublons retirés, corrections manuelles ;
  - importé par migration, mise à jour par identifiant Wikidata.
- `ui/` : Directory (filtres + liste + carte), DirectoryMap (Leaflet, CARTO/OSM), PlaceMap, PlaceActions ; `admin/CoordsHelp`.

## Dépend de
`confiance` (vérification), `membres/ui` (SaveButton), `platform` (référentiel, accès, stockage).

## Événements
Enregistrer une fiche rafraîchit /annuaire, le secteur et la fiche (revalidatePath) — sans redéploiement.

## Règles propres
- Une fiche n’affiche une date que si `verifiedAt` est renseigné (jamais la date de mise à jour technique).
- Sans coordonnées GPS, la carte montre une position approximative, signalée comme telle.
- Les coordonnées ne s’affichent à tous que si `showContacts` est coché.
- Aucune copie de Tripadvisor, Google ou autre site : uniquement des sources ouvertes ou nos propres contenus.
- Pas de publication sans photo sous licence ; auteur et licence toujours affichés (couverture comprise).
- Un lieu importé est publié « Repérée — à vérifier », avec ses sources.

## Accès
Neon (lecture), Vercel Blob (photos).

## Skills
- `skills/ajouter-une-adresse` — Ajouter ou compléter une adresse de l’annuaire DALIL dans /admin (fiche, localisation, photos, publication).

## Prochaines étapes
- Saisir coordonnées et photos des 10 adresses reprises du prototype.
- Bouton carte sur mobile (à valider avec Rad).

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
