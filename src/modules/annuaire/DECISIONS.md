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

## 2026-10-21 — Accueil : toutes les rubriques, pas seulement le voyage (décision de Rad)
- **Constat** : l’accueil montrait surtout des lieux touristiques ; santé, services, démarches et Vie musulmane étaient absents. Les recherches des Algériens portent d’abord sur l’emploi, la santé, les études et les démarches.
- **Décision** : ordre unique partout (menu, portes, sections) : Vie musulmane, Services — Santé en tête —, Découvrir (tourisme, sorties, divertissement), Démarches, Vivre en Algérie. Annonces (immobilier, emploi, véhicules, objets) arrive au lot 2, avec sa porte et sa section.
- **Accueil** : diaporama mixte (mosquée, santé, sortie, bureau officiel) avec photos propres aux fiches uniquement ; portes = rubriques du menu, mêmes mots ; incontournables, envies et villes regroupés dans un seul bloc Découvrir ; trois guides pour Démarches et pour Vivre.
- **Recherche** : suggestions directes hors tourisme (dentiste à Alger, pédiatre, plombier, pharmacie, papiers, mosquée).
- **À ne pas refaire** : afficher une porte vers une rubrique vide ; laisser un seul module (annuaire) composer seul l’accueil.
- 2026-10-24 — coordonnées des adresses du prototype cherchées dans OpenStreetMap (`scripts/import/fetch-prototype-coords.mjs`, action « Coordonnées du prototype », résultat dans `data/prototype-coords.json`) : 9 adresses absentes d’OSM, « Mega Pizza » présente deux fois dans la wilaya de Constantine, aucune à Boussouf. Aucun point attribué (règle 3 : ne rien inventer) ; position approximative signalée conservée ; saisie par l’équipe dans /admin (aide « Coordonnées ») après vérification sur place. Darna a déjà un point.
- 2026-10-22 — données géographiques dans Neon avec PostGIS (colonne générée `geom` + index GiST, `placesNear`) ; jeux bruts (`osm-places.json` 16 Mo, `open-places.json` 10 Mo) retirés du code du site : branche `import-data` + archive Vercel Blob ; lots sélectionnés gardés pour les migrations mais exclus des fonctions serveur — `osm-selected.json` était embarqué dans ~70 fonctions. Usages vérifiés avant : les bruts ne servent qu’aux scripts d’import, jamais au site ni aux migrations.

## 2026-10-26 — Catégorie sans fiche : jamais une liste vide (décision de Rad)
- **Décision** : une catégorie sans fiche affiche d’autres adresses réelles de la même rubrique, plus « proposer une adresse ». Aucune adresse inventée.
- **À faire** : remplir les 21 catégories sans fiche par l’import OpenStreetMap (tags à ajouter), Vie musulmane validée par Saïd.

## 2026-10-26 — Fiche lieu : un modèle unique (maquette validée par Rad)
- **Décision** : toutes les fiches suivent la maquette « Fiche lieu » (ordinateur et mobile) : galerie, identité (nom, statut, Itinéraire / Enregistrer / Partager), infos pratiques et carte, Présentation, « En bref », « Vous connaissez ce lieu ? », À proximité, provenance discrète en bas.
- **Statut** : deux niveaux seulement (« À vérifier · visite DALIL à venir » / « Vérifiée par DALIL le … »).
- **En bref** : seulement les faits connus (`factsOf`, `present.ts`, testé) — jamais une case « à confirmer » ; bouton « Compléter une information » pour le reste.
- **Texte** : présentation professionnelle ; la provenance n’apparaît plus dans le texte (`presentIntro`), elle reste dans « Sources » ; attribution OpenStreetMap (ODbL) toujours visible en bas de fiche.
- **Faits** : champ `facts` (libellé, valeur, source). Rempli par `scripts/import/build-facts.mjs` depuis OpenStreetMap (ODbL) et Wikidata (CC0) — action « Import des faits » sur `import-data` → `data/place-facts.json` → migration `20261026_213000_faits_lieux_donnees` (remplace seulement les faits importés, jamais ceux saisis dans /admin). Une valeur inconnue n’est jamais traduite au hasard : elle est omise.
- **Photos** : sans photo du lieu, photo de la ville si DALIL en a une (« Photo d’illustration »), sinon visuel neutre `/images/lieu.svg`. **À ne pas refaire** : montrer la photo d’Alger pour une autre ville.
- **À proximité** : lieux à moins de 3 km, sauf ceux à moins de 25 m (même bâtiment ou doublon) ; lieux avec vraie photo d’abord.
- **Corrections** : Djamaâ El Kebir (texte faux « époque ziride », minaret daté au XIVe siècle faute d’accord des sources) ; doublon « Grande Mosquée d’Alger (Djamaa El Kebir) » dépublié ; écoles étiquetées `religion=muslim` dans OSM sans « coranique » dans le nom reclassées de « Écoles coraniques » vers « Écoles ».

## 2026-10-26 — Retraits (décision de Rad)
- **Retirés de DALIL** : écoles et instituts de musique ; toutes les zaouïas et écoles coraniques soufies ou chiites ; tout lieu qui sert de l’alcool.
- **Méthode** : migration `20261026_230000_retraits` — fiches dépubliées (restaurables), motif dans les notes ; un import futur ne les recrée pas.
- **Repérage** : nom (français et arabe) dans les catégories religieuses et éducatives seulement — une ville ou un quartier « Zaouia » ne suffit pas (bureaux de poste, écoles publiques gardés) ; alcool : étiquettes OpenStreetMap (bar, pub, boîte de nuit, caviste, `drink:*`) via `scripts/import/fetch-alcohol.mjs` (branche `import-data`) → `data/alcohol-osm.json`.
- **Limite** : OpenStreetMap ne signale l’alcool que pour 33 lieux en Algérie (aucun dans DALIL au 2026-10-26). Les hôtels et restaurants sans information restent publiés ; à contrôler lors des visites DALIL.
- **À ne pas refaire** : importer `amenity=bar|pub|nightclub`, `shop=alcohol|wine`, `amenity=music_school`, ni une zaouïa.
- **Puis, même jour (demande de Rad)** : suppression définitive des 56 fiches retirées (migration `20261026_235900_suppression_retraits`, via Payload : versions, index et journal d’audit à jour). Restauration seulement par la sauvegarde quotidienne ou l’historique Neon. Règle unique `exclusions.ts` (testée) appliquée par `importPlaces` : ces lieux ne sont plus jamais importés.

## 2026-10-27 — Couverture « comme Google » (demande de Rad)
- **Constat** : « mosquée Draria » donnait 5 mosquées ; Google en montre une vingtaine. OpenStreetMap ne gardait que les lieux nommés.
- **Décision** : Overture Maps (licence CDLA Permissive 2.0, stockage permis) pour tout DALIL — 20 555 fiches proposées, 1 087 fiches existantes complétées (téléphone, site, email, Facebook, Instagram, adresse) ; plus toutes les mosquées OSM, y compris sans nom (4 833). Autour de Draria (3 km) : 9 → 21 mosquées.
- **Jamais** de données Google copiées (licence) ; jamais d’alcool, de musique, de culte non musulman ni de zaouïa (filtres à la sélection et `exclusions.ts` à l’import).
- **Doublons** : même nom proche à moins de 80 m ; même catégorie à moins de 15 m (même écriture) ou 80 m (arabe / latin).
- **À ne pas refaire** : dédoublonner par nom seul dans une wilaya (toutes les « Mosquée · nom à compléter » d’une wilaya fusionnaient).
