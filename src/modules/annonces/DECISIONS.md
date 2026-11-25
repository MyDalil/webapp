# Annonces — décisions

## 2026-10-21 — Création du module (décisions de Rad, détails par défaut de Claude)
- **Rad** : rubrique Annonces au menu et à l’accueil, catégories immobilier, emploi, véhicules, objets. « Fais au mieux » pour le reste.
- **Contrôle avant publication** : toute annonce passe par un humain. Raison : arnaques fréquentes (emploi, location), règle « un humain publie ». Réversible si le volume l’exige (publication immédiate puis contrôle).
- **Durée** : 45 jours, avertissement 3 jours avant, renouvellement dans les 7 derniers jours ou après expiration, sans nouveau contrôle si le contenu n’a pas changé.
- **Limites** : 10 annonces en cours par particulier, 50 par professionnel ; dépôt 10 par heure ; messages 40 par heure et par conversation.
- **Messagerie DALIL** : la personne intéressée écrit en premier ; ses coordonnées sont masquées tant que l’annonceur n’a pas répondu. L’annonceur partage les siennes quand il le veut.
- **Signalements** : enregistrés dans la boîte de réception (type « Signalement d’une annonce ») ; trois signalements remettent l’annonce au contrôle.
- **Sous-catégorie stockée « categorie:type »** : un même type (« maison ») existe dans deux catégories.
- **À ne pas refaire** : publier une porte ou un lien vers une rubrique sans page ; laisser un agent changer l’état d’une annonce.

## 2026-10-26 — Aucune catégorie vide (décision de Rad)
- **Décision** : réel d’abord, exemples ailleurs. 20 annonces d’exemple, une par type, sur tous les environnements.
- **Règles** : badge « Exemple », messagerie et signalement refusés, hors plan du site, hors compteurs, jamais expirées ; une vraie annonce publiée dans le même type masque l’exemple. Auteur facultatif pour un exemple seulement.
- **À ne pas refaire** : présenter un exemple comme une vraie annonce ; compter les exemples dans « N annonces ».

## 2026-11-14 — Score anti-arnaque (lot 9 du cockpit)
- **Décision** : un score explicable trie la file de contrôle ; chaque point vient d’un signal visible. Il ne publie, ne refuse et ne masque rien.
- **Raison** : règle « rien n’est publié sans un humain » ; un score opaque ou automatique créerait des refus injustes.
- **À ne pas refaire** : transformer le score en refus automatique ; comparer un prix à une médiane calculée sur moins de 5 annonces.

## 2026-11-15 — Plus d’annonce d’exemple en production (décision de Rad)
- **Décision** : en production, les annonces `example` ne sont plus listées. Hors production, elles restent pour tester. Une catégorie sans annonce invite à publier la première.
- **Raison** : un guide de confiance ne montre pas de fausse annonce.

## 2026-11-15 (soir) — Les fiches d’exemple reviennent en production (décision de Rad)
- **Décision** : le masquage des exemples en production, décidé le matin, est annulé. Rad veut les fiches d’exemple complètes : une page reste belle et donne envie de s’inscrire même sans inscrit. Les règles du 2026-10-26 s’appliquent de nouveau (badge « Exemple », demandes refusées en production, hors compteurs).
- 2026-11-25 — filtres d’adresse des annonces (catégorie, type, wilaya, transaction) : seules les valeurs connues sont appliquées, les autres ignorées — une valeur inconnue d’un champ « select » faisait échouer la requête Postgres (erreur 500 sur /annonces/vehicules?type=412578441, vue par /etat le 25 nov.).
