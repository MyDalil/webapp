# Décisions — Contenus

Format : `- AAAA-MM-JJ — décision — raison`. Ne jamais réécrire une entrée : en ajouter une nouvelle qui la remplace.

- 2026-10-06 — module créé lors de la réorganisation par métiers — chaque métier évolue indépendamment avec sa mémoire.
- 2026-10-24 — `/en` et `/ar` : vraies pages d’accueil dans leur langue (traduction fidèle des rubriques de l’accueil français, liens vers chaque service), au lieu de pages d’attente ; indexées. Les pages suivantes restent en français, ce qui est dit sur la page ; noms, adresses et horaires jamais traduits (affichés comme publiés par leur source).

## 2026-10-27 — Porte « Vie musulmane » (demande de Rad)
- L’image « Vie musulmane » de l’accueil et le menu ouvrent `/vie-musulmane` (page de rubrique, comme /services, /explorer), plus le guide : six entrées du menu (validées par Saïd), nombre d’adresses, photo réelle, « Mosquées autour de moi ». Le guide reste accessible depuis la page.
- Guides du prototype : lien retour et rubrique sur deux lignes, étapes numérotées, sans grand vide.
- Mobile : bulle « Créer mon compte » sur l’accueil seulement.

## 2026-10-27 — Page Démarches (demande de Rad)
- `/demarches` dédiée (remplace la page « parcours de démonstration » du prototype) : texte qui explique comment DALIL aide, essentiels du menu (nombre d’adresses officielles), sites officiels, guides pratiques.
- Sites officiels (`officialSites.ts`) : équivalents algériens des sites publics gratuits français ; seulement des adresses relevées dans une source citée et datée (relevé du 27 octobre 2026). Avertissement contre les copies (.com, .online) et les intermédiaires payants.
- À compléter après vérification : CNAS (El Hanaa), ANEM, CNR, AADL, ONEC, CNRC, ANAE — adresses non encore relevées dans une source fiable.
- 2026-10-27 — Guide CCR (`demarches/ccr.ts`, page `/demarches/ccr`) : chaque fait renvoie à ses sources numérotées, relevées le 27/10/2026 ; la presse est marquée « à recouper avec le Journal officiel ». Corrections des maquettes de Rad : 3 ans de résidence (pas 1), plafond étudiants/stagiaires 8 M DA, véhicule neuf ou de moins de 5 ans (LF 2026). Projet LF 2027 (redevance 20 000 DA) signalé comme non adopté.
- 2026-10-27 — /demarches : la mention « DALIL ne vous demande jamais de payer une démarche » devient « Les démarches se font gratuitement sur les sites de l’État » (cohérent avec les packs payants d’aide humaine).
- 2026-10-27 — Démarches phares en fiches sourcées (`demarches/`: passeport, auto-entrepreneur, CCR) rendues par `/demarches/[slug]` : visuel icône (pas d’illustration inventée), points clés sourcés, guide pas à pas, liens officiels, FAQ, sources. Page /demarches : recherche, catégories populaires, démarches phares (maquettes de Rad).
- 2026-10-27 — Tout le site au format « application » (demande de Rad) : guides (`/guides`, `/guides/[slug]`, contenu lu dans les pages du prototype par `guides.ts`), rubriques `/explorer`, `/vie-pratique`, `/business-emploi` (`hubs.ts` + `ui/HubView`), cartes illustrées de même taille, défilement au doigt sur mobile.
- 2026-10-27 — Photos réelles libres (Wikimedia Commons) choisies une à une pour leur sujet (`platform/referentiel/photos.ts`, sources dans `photos-sources.json`, crédits sur /credits-photos). Refusées : photos hors Algérie ou hors sujet (ex. « banque » = Algiers en Louisiane). Sans photo juste : pictogramme sur dégradé, jamais une image approximative. Passeport : vraie photo du passeport algérien posée sur un dégradé DALIL.
- 2026-10-27 — Rubriques, guides et démarches reconstruits avec les briques de l’accueil (`platform/ui/Xp.tsx` : héros plein écran à diaporama ou parallaxe, grandes tuiles photo en carrousel, bande parallaxe, apparitions au défilement) — retour de Rad : « des images superbes comme sur la main page ». Peu de tuiles (≤ 4) : grille pleine largeur sur ordinateur. Guides regroupés en 4 grands thèmes (aucune rangée d’une seule tuile).
- 2026-10-27 — Photos HD choisies dans les catégories Commons (Grande Poste d’Alger, pont de Constantine, Hoggar, Université d’Alger, BNA, port d’Alger…) ; photos documentaires médiocres retirées (mairies, bureaux de poste, aéroport…).
- 2026-10-31 — `/en` et `/ar` (remplace la décision du 2026-10-24) : même accueil que le français (`app/(site)/HomeView.tsx`, mêmes sections, liens et photos), textes traduits dans `homeText.ts` ; en-tête, menu, sélecteur de wilaya, recherche, bulle d’inscription, assistant et pied de page (`footerI18n.ts`) suivent la langue de l’adresse. Arabe : `dir="rtl"` posé avant l’affichage, police IBM Plex Sans Arabic, carrousels et flèches inversés. Les pages suivantes restent en français pour l’instant. Noms, adresses et horaires jamais traduits.
