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
  - `open-places.json` : jeu brut (Wikidata CC0 + photos Commons + notes Wikipédia internes), produit par `scripts/import/fetch-places.mjs` via l’action GitHub « Import des lieux » — **hors du code du site** : branche `import-data` + archive Vercel Blob `imports/wikidata/` ;
  - `descriptions-*.json` : textes DALIL rédigés à partir des faits (jamais copiés) ;
  - `open-places-selected.json` : lot publiable (`node scripts/import/select-places.mjs`) = photo libre + texte DALIL, doublons retirés, corrections manuelles ;
  - importé par migration, mise à jour par identifiant Wikidata.
  - `research-places.json` : fiches documentées sur les sites officiels (`scripts/import/select-research.mjs`) ;
  - `osm-places.json` (brut, action « Import OSM », **hors du code du site** : branche `import-data` + archive Vercel Blob `imports/osm/`) → `osm-selected.json` (`scripts/import/select-osm.mjs`, lancé sur `import-data`), ODbL ;
  - les lots sélectionnés (`*-selected.json`, `research-places.json`) restent versionnés : les migrations en ont besoin pour reconstruire une base ; ils sont exclus des fonctions serveur (`outputFileTracingExcludes`).
  - Neon / PostGIS : colonne `geom` (point calculé depuis lat/lng, index spatial GiST) ; `placesNear` pour la proximité.
  - `importPlaces.ts` : import idempotent, complète sans écraser.
- `searchPlaces` / `getPlaceCounts` + `/api/annuaire` : recherche et compteurs côté serveur.
- `filters.ts` : règle unique des filtres de l’annuaire (wilaya, thème nature, coups de cœur, critères vérifiés…), testée (`filters.test.ts`).
- `Events.ts` (Événements) + `weekend.ts` : page « Que faire ce week-end ? » — week-end algérien (vendredi-samedi, heure d’Alger), jamais d’événement terminé, confirmés séparés des incomplets, un filtre n’est jamais satisfait par une information inconnue ; testé (`weekend.test.ts`).
- `FeaturedDestination.ts` : réglage /admin « Destination à l’honneur » (bloc panoramique de l’accueil, repli Sahara).
- Champ `favorite` (Coup de cœur DALIL, sélection éditoriale) et `contributor` (habitant cité) sur les fiches.
- `ui/` : Directory (filtres + liste + carte), DirectoryMap (MapLibre + OpenFreeMap, regroupement des repères), PlaceMap, PlaceActions, HomeEntries (portes de l’accueil, une par rubrique du menu), WeekendExplorer ; `admin/CoordsHelp`.

## Dépend de
`confiance` (vérification), `membres/ui` (SaveButton), `platform` (référentiel, accès, stockage).

## Événements
Enregistrer une fiche rafraîchit /annuaire, le secteur et la fiche (revalidatePath) — sans redéploiement.

## Règles propres
- Une fiche n’affiche une date que si `verifiedAt` est renseigné (jamais la date de mise à jour technique).
- Sans coordonnées GPS, la carte montre une position approximative, signalée comme telle.
- Les coordonnées ne s’affichent à tous que si `showContacts` est coché.
- Aucune copie de Tripadvisor, Google ou autre site : uniquement des sources ouvertes ou nos propres contenus.
- Pas de publication sans photo sous licence ; auteur et licence toujours affichés (couverture comprise). Exception : repères pratiques importés (photo de la ville, créditée).
- Fiche OpenStreetMap : attribution « © les contributeurs OpenStreetMap (ODbL) » toujours visible.
- Un lieu importé est publié « Repérée — à vérifier », avec ses sources.
- Un événement « confirmé » cite sa source (validation dans /admin) ; sinon il s’affiche « À confirmer ».
- Coup de cœur, destination à l’honneur et classement : jamais liés à un paiement.

## Accès
Neon (lecture), Vercel Blob (photos).

## Skills
- `skills/ajouter-une-adresse` — Ajouter ou compléter une adresse de l’annuaire DALIL dans /admin (fiche, localisation, photos, publication).

## Prochaines étapes
- Photos des adresses reprises du prototype ; coordonnées : absentes d’OSM (vérifié le 2026-10-24), à relever sur place.
- Bouton carte sur mobile (à valider avec Rad).

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
