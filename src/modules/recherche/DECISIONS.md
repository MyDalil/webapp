# Décisions — Recherche & Assistant

Format : `- AAAA-MM-JJ — décision — raison`. Ne jamais réécrire une entrée : en ajouter une nouvelle qui la remplace.

- 2026-10-06 — module créé lors de la réorganisation par métiers — chaque métier évolue indépendamment avec sa mémoire.
- 2026-10-17 — une seule barre, texte ou voix ; la dictée devient un brouillon propre et modifiable avant envoi ; reformulation sans omettre aucune idée ; validation au moment d’agir — décision de Rad.
- 2026-10-17 — IA Claude Haiku 4.5 via l’API Anthropic, réservée aux comptes vérifiés, 20/jour/compte, plafond 10 $/mois, nettoyage simple au-delà — décision de Rad ; argument à mettre dans les offres.
- 2026-10-17 — dictée du navigateur avec choix de langue (FR, عربي, EN) maintenant, moteur spécialisé (type Whisper) plus tard — décision de Rad.
- 2026-10-17 — la barre comprend et ouvre la page pré-remplie, sans préparer de réservation — décision de Rad (option A).
- 2026-10-17 — texte tapé : bouton ✦ « Améliorer » facultatif et annulable, jamais de reformulation automatique — décision de Rad.
- 2026-10-17 — « Demandez à DALIL » : conversation guidée dans un panneau (échanges gardés, question de précision, page proposée), contexte autorisé = titre de la page + wilaya choisie ; fermer (× ou Échap) ne déplace pas la page ; pas de réponses rédigées librement — décision de Rad.
- 2026-10-22 — IA passée de Claude Haiku 4.5 à Claude Haiku 5.5 (successeur direct, 10 fois moins cher : 0,10 $ / 0,50 $ par million de jetons). Haiku 5.5 refuse `temperature` : retirée, effort `low` à la place ; marge de 1 024 jetons pour sa réflexion ; un refus du modèle bascule sur le nettoyage simple. Quotas et plafond inchangés.
- 2026-10-22 — plan du site dynamique (`sitemap.ts`) : index + fichiers par type, contenus publiés seulement, annonces en ligne et non expirées, fiches de démonstration exclues, pages privées et d’attente (`/ar`, `/en`) exclues ; robots fermé hors production — le contenu (22 000 adresses, wilayas, pros) évolue sans redéploiement.

## 2026-10-26 — /recherche montre de vrais résultats (constat de Rad)
- **Constat** : « hopital » depuis l’accueil ne montrait que deux guides. La page /recherche (prototype) ne cherchait que dans les guides.
- **Décision** : `searchEverything` comprend la demande par mots-clés (`localIntent`, sans IA, sans accent) puis interroge l’annuaire, les praticiens, les prestataires et les annonces. Bouton « Affiner » vers la page pré-remplie. La recherche guidée reste en dessous.
- **À ne pas refaire** : une barre de recherche qui ne cherche pas dans les contenus réels.

## 2026-10-26 — Recherche complète et indexation (décision de Rad : « absolument complet + indexation »)
- **Index interne** : table `search_index` (Neon), extensions `unaccent` et `pg_trgm`, colonnes générées (texte sans accent, `tsvector` français pondéré titre/texte). Toutes les rubriques, catégories et sous-catégories y figurent, avec des synonymes courants (hopital → Hôpitaux, plombier → Plomberie, f3 → Appartement…).
- **Classement** : plein texte par préfixes + similarité du titre + bonus (vérifiée, label, vrai prestataire) ; exemples classés après le réel. Une requête par groupe pour que les catégories restent visibles.
- **Lieu** : wilaya ou commune reconnue dans la phrase, retirée de la recherche, contenus de la wilaya d’abord ; une catégorie trouvée avec un lieu ouvre « catégorie × wilaya ».
- **Google** : pages catégorie et catégorie × wilaya avec titre, description et adresse canonique ; fichier `categories` du plan du site.
- **Testé** sur une base neuve complète (22 653 adresses) : « hopital oran », « pharmasie » (faute), « pediatre alger », « avocat constantine », « f3 », « voiture » donnent la bonne catégorie et de vrais contenus.
- **Donnée à corriger** : le référentiel des communes contient une commune « Alger » rattachée à la wilaya 34 (à vérifier) ; la wilaya l’emporte désormais.
