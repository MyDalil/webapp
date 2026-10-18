# Décisions — Annuaire & Lieux

Format : `- AAAA-MM-JJ — décision — raison`. Ne jamais réécrire une entrée : en ajouter une nouvelle qui la remplace.

- 2026-10-06 — module créé lors de la réorganisation par métiers — chaque métier évolue indépendamment avec sa mémoire.
- 2026-10-06 — le champ de statut s’appelle `verification`, pas `status` — `status` entrait en collision avec l’enum `_status` des brouillons Payload.
- 2026-10-06 — seule `verifiedAt` est affichée comme date sur une fiche — la date de mise à jour technique (seed) trompait le visiteur.
- 2026-10-06 — fichier de requêtes renommé `queries.ts` — `places.ts` et `Places.ts` entraient en conflit sur les systèmes insensibles à la casse (macOS).
- 2026-10-08 — annuaire pré-rempli depuis Wikidata/Commons (aucune copie de Tripadvisor ni de photos sans licence) ; publication seulement avec photo libre + texte DALIL ; textes rédigés à partir des faits, Wikipédia gardé en note interne — demande de Rad, cadre légal validé.
- 2026-10-08 — photos Commons affichées depuis upload.wikimedia.org avec crédit (pas de copie dans Vercel Blob) — préserve le quota et garde l’attribution à jour.
- 2026-10-08 — tri par `score` descendant ; toute fiche reçoit un score à l’enregistrement (sinon les NULL passent en tête en Postgres).

## 2026-10-16 — Carte : OpenFreeMap + MapLibre
- **Décision** : fond de carte OpenFreeMap (positron, dark en thème sombre), moteur MapLibre, repères regroupés en bulles chiffrées qui s’ouvrent au clic.
- **Raison** : CARTO exige désormais une clé (« API KEY REQUIRED ») ; 314 repères Leaflet empilés étaient illisibles. OpenFreeMap : gratuit, sans clé ni compte, données OpenStreetMap. Leaflet retiré.
- **À ne pas refaire** : dépendre d’un fond de carte tiers « gratuit » sans vérifier ses conditions d’accès.

## 2026-10-17 — Document maître UI/UX (décisions de Rad)
- Accueil : 8 entrées photo (week-end, à découvrir, près de chez vous, nature & bien-être, vivre dans ma ville, bonnes adresses, quotidien, coups de cœur) à la place des 3 cartes ; photos des fiches publiées uniquement.
- « Que faire ce week-end ? » : collection Événements + lieux à visiter en attendant ; filtres wilaya, dates, distance (depuis la wilaya choisie, jamais de géolocalisation), budget, famille, accessibilité, type.
- Coups de cœur : case cochée par l’équipe. Destination à l’honneur : réglage /admin, une seule à la fois, pas de carrousel.
- À ne pas refaire : nommer un champ `status` dans une collection avec brouillons (conflit d’énumération avec `_status`) → `reliability`.

## 2026-10-17 — Remplir toutes les catégories (demande de Rad)
- **Décision** : trois sources de fiches, jamais Google ni Tripadvisor : (1) recherche documentaire sur les sites officiels (ministères, wilayas, universités, CHU, offices du tourisme) → `data/research-places.json` ; (2) OpenStreetMap (ODbL) via l’action « Import OSM » → `osm-places.json`, filtré par `scripts/import/select-osm.mjs` → `osm-selected.json` ; (3) Wikidata existant. Import par migration (`importPlaces`), idempotent, statut « Repérée — à vérifier ».
- **Photos** : une fiche importée sans photo libre est publiée avec la photo de sa ville (crédit affiché) — exception assumée à « pas de publication sans photo » pour les repères pratiques (écoles, mosquées, mairies, bureaux de poste, gares).
- **Licence OSM** : chaque fiche OSM cite « OpenStreetMap — © les contributeurs OpenStreetMap (ODbL) » avec lien vers l’objet ; seuls les faits sont repris ; présentation rédigée par DALIL.
- **Qualité** : un lieu OSM est retenu s’il est un repère essentiel (hôpital, université, école, mosquée, mairie, bureau de poste, gare, ambassade, office du tourisme, secours) ou s’il porte au moins un fait pratique (téléphone, site, adresse, horaires, email). Doublons retirés (nom + wilaya).
- **Échelle** : l’annuaire cherche côté serveur (`searchPlaces`, `/api/annuaire`) ; les compteurs viennent de `getPlaceCounts` ; les pages statiques sont limitées aux 400 fiches les mieux classées (les autres sont rendues à la demande).
- **Nouvelle catégorie** « Bureaux de poste » (repérés au nom ou à l’opérateur Algérie Poste).
- **À ne pas refaire** : charger toutes les fiches dans le navigateur ; copier un texte ou une photo d’un annuaire commercial.
