# Accompagnement — packs payants d’aide aux démarches

Département responsable : **User Operations & Support**. Lire aussi `AGENTS.md` à la racine.

## Rôle
Proposer, à côté de chaque guide gratuit de démarche, un pack payant : un conseiller aide la personne et relit son dossier. La démarche elle-même reste gratuite sur les sites officiels de l’État.

## Contenu
- `Packs.ts` — un pack par démarche : nom, démarche, guide gratuit lié (chemin), résumé, éléments inclus, prix € et DA (vides = « Tarif annoncé au lancement »), proposé, ordre.
- `Requests.ts` — demandes (`demandes-accompagnement`) : pack, nom, email, téléphone, pays, situation, statut (liste d’attente, à contacter, en cours, terminée, annulée), conseiller, notes internes.
- `Settings.ts` — réglage global : état de l’offre (cachée / liste d’attente / ouverte), paiement en ligne (désactivé), WhatsApp du conseiller, email des alertes.
- `rules.ts` (+ test) — mode appliqué, prix affiché, numéro WhatsApp.
- `offer.ts` — lecture de l’offre, packs, création d’une demande + emails (équipe, accusé de réception).
- `texts.ts` — texte de transparence, absence de garantie, « Pourquoi choisir nos accompagnements payants ? ».
- `ui/` — `Choice` (option 1 guide autonome / option 2 pack), `Transparency`, `Why`, `Booking` (nombre de personnes, tarification, mode de paiement fermé, coordonnées), `RequestForm`.
- Routes : `/accompagnement`, `/accompagnement/[slug]` (noindex), `/api/accompagnement`. Blocs affichés sur `/demarches` (démarches phares), `/demarches/[slug]` et chaque `/guides/*` lié à un pack. Prix par personne (`perPerson`) : le total se calcule au nombre de personnes.

## Règles propres
- **Transparence** : le texte de transparence accompagne toujours l’offre. Les démarches sont gratuites sur les sites de l’État ; le pack paie l’aide humaine.
- **Aucune garantie** (décision de Rad) : jamais de promesse de résultat ni de délai de l’administration.
- **Prix jamais inventés** : seul Rad fixe un prix, dans /admin.
- **Offre cachée en production** tant que l’état n’est pas changé dans /admin. Hors production (preview, CI, local), « cachée » s’affiche en liste d’attente pour l’équipe.
- **Pas de paiement** tant qu’aucun compte marchand n’existe : rien n’est encaissé par le site.
- **Données personnelles** : demandes lisibles par l’administration et le rôle `conseiller` seulement. Le conseiller ne voit rien d’autre dans /admin.
- Indépendant du module `confiance` : un pack n’attribue aucun label.

## Dépend de
`platform` (accès, mail, http, sécurité), `contenus` (guides, page CCR).

## Accès
Aucun service externe (Resend via `platform/mail`).

## Prochaines étapes
- Lancement : nommer le conseiller (rôle « Conseiller » dans /admin › Utilisateurs), saisir son WhatsApp, passer l’offre en « Liste d’attente » puis « Ouverte ».
- Prix des packs autres que CCR, et équivalent en dinars.
- Paiement (CIB/Edahabia via un prestataire agréé, carte pour l’étranger) quand le compte marchand existe.

Décisions et erreurs à ne pas refaire : `DECISIONS.md`.
