# Décisions — Services

Format : `- AAAA-MM-JJ — décision — raison`.

- 2026-10-16 — modèle Yoojo : le client décrit son besoin et choisit un prestataire, qui accepte ou décline sous 24 h — décision de Rad (option A).
- 2026-10-16 — DALIL n’encaisse rien : horaire ou forfait par activité, prix final confirmé dans la messagerie — décision de Rad.
- 2026-10-16 — messagerie DALIL uniquement, numéros jamais affichés — décision de Rad.
- 2026-10-16 — identité + statut légal obligatoires pour tous, casier pour les missions sensibles — décision de Rad (B + C).
- 2026-10-16 — zone par wilaya puis communes ; centres des communes stockés (Wikidata, CC0) pour un futur rayon en km calculé en interne, sans géocodeur tiers — décision de Rad.
- 2026-10-16 — 11 catégories dont cours coraniques et coach sportif — décision de Rad.
- 2026-10-16 — filtre femme/homme pour tous ; option « réservé aux clientes / clients » au choix du prestataire — décision de Rad.
- 2026-10-16 — mission non signalée 48 h après sa fin : clôturée automatiquement et avis proposé — évite les missions bloquées « acceptées ».
- 2026-10-16 — 5 demandes en attente maximum par client — limite les demandes en masse.
- 2026-10-16 — jeu de communes non sous licence (othmanus/algeria-cities) écarté ; Wikidata CC0 retenu — pas de réutilisation sans licence.
- 2026-10-16 — photos de profil et photos des avis publiées tout de suite, contrôlées ensuite par l’équipe — décision de Rad.
- 2026-10-16 — photos des catégories : libres de droits (Unsplash) et, si besoin, générées mais réalistes, sans mention ; style gros plan (mains, outils, objets) — décision de Rad ; choix final reporté.
- 2026-10-16 — pièces justificatives stockées dans Neon (pas Vercel Blob, dont les fichiers sont publics), supprimées à la vérification ou après 30 jours — minimum de tiers, données sensibles.
- 2026-10-16 — envoi plafonné à 4 Mo (limite Vercel 4,5 Mo par requête), photos réduites dans le navigateur avant l’envoi.

## 2026-10-26 — Aucune catégorie vide (décision de Rad)
- **Décision** : un prestataire d’exemple par catégorie (11, `demo`, slug `exemple-<catégorie>`), créé partout, prix « à convenir » (aucun tarif inventé).
- **Production** : une fiche `demo` est un exemple — badge, demandes refusées par le serveur, formulaire remplacé, page non indexée. Hors production, elle reste une fiche de test réservable.
- **Masquage** : un vrai prestataire publié dans la catégorie masque l’exemple ; les compteurs ne comptent que les vrais.
