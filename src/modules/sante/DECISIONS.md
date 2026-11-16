# Décisions — Santé

Format : `- AAAA-MM-JJ — décision — raison`.

- 2026-10-16 — modèle Doctolib complet pour les praticiens (agenda, créneaux confirmés immédiatement, rappel, annulation/déplacement) — décision de Rad ; les établissements gardent la demande simple.
- 2026-10-16 — compte obligatoire pour réserver, vérifié par email — décision de Rad.
- 2026-10-16 — visio dès le lancement, sur téléphone sans application ; fournisseur pas encore retenu — décision de Rad.
- 2026-10-16 — DALIL hors de la boucle de paiement : le patient paie le praticien ; paiement en ligne intégré plus tard via un prestataire à reversement direct — décision de Rad.
- 2026-10-16 — publication d’un praticien seulement après vérification de l’identité et du droit d’exercer — santé = données et responsabilité sensibles.
- 2026-10-16 — pas de rétro-ingénierie de services tiers : WebRTC et logiciels open source suffisent, sans risque juridique.

## 2026-10-26 — Jamais de faux praticien en production (décision de Rad)
- **Décision** : aucun praticien d’exemple. Sans praticien réservable, la recherche montre de vrais établissements de santé de l’annuaire (wilaya choisie d’abord, statut « à vérifier » affiché).
- **Raison** : une personne réelle ne doit jamais pouvoir réserver chez un médecin qui n’existe pas.

## 2026-11-02 — Audit interne A11, A12, A13
- **Chevauchement** : un créneau qui touche un rendez-vous confirmé (intervalle complet) n’est plus proposé ; plages superposées fusionnées ; contrainte d’exclusion Postgres `appointments_no_overlap` (btree_gist) contre deux réservations simultanées.
- **Visio** : réservable seulement si `VIDEO_PROVIDER` désigne un fournisseur implémenté dans `platform/video.ts` (aucun aujourd’hui). Sans salle créée, la réservation est annulée et le patient prévenu.
- **Rappels** : marqués envoyés seulement si Resend les accepte, retentés à l’exécution suivante (jusqu’à 2 h avant), clé d’idempotence par rendez-vous. Le motif n’entre jamais dans la mesure d’audience.

## 2026-11-15 — Page Santé : une seule liste
- Décision (Rad) : la page `/praticiens` montre toujours les praticiens réservables en ligne, puis les médecins et établissements de l’annuaire (médecins d’abord). Plus de titre négatif « Pas encore de praticien ».
- Décision (Rad) : chaque fiche « Médecins » de l’annuaire porte le lien « Vous êtes ce praticien ? Activez la prise de rendez-vous ».
- Rappel (remplacé le 2026-11-16, voir plus bas) : le praticien de démonstration n’existait pas en production.
- Raison : jamais de vitrine vide ni de faux praticien ; chaque fiche sert à recruter le praticien.

## 2026-11-16 — Praticien d’exemple en production, visio et agenda (décision de Rad)
- **Décision (Rad)** : les premiers médecins qui visitent DALIL doivent trouver le praticien d’exemple avec tout le parcours : agenda, réservation, email, ajout à l’agenda, visio. On n’attend pas une première inscription. Remplace la règle du 2026-10-26 « jamais de faux praticien en production ».
- **Garde-fous** : badge « Exemple » partout ; bandeau sur la fiche ; mention « Démonstration » dans les emails et l’agenda ; fiche exclue du plan du site et de Google (`noindex`) ; rendez-vous d’exemple effacés après l’heure prévue (tâche `rendez-vous-demo`). Migration `20261116_150000_demo_praticien_production`, ouvert 7 j/7 de 8 h à 20 h.
- **Visio (Rad)** : LiveKit, open source (Apache 2.0) — Daily écarté car son moteur de visio n’est pas open source. Hébergé sur LiveKit Cloud (offre gratuite plafonnée, sans facturation surprise), déplaçable sur un serveur DALIL sans changer le code. Entrée par la page `/visio/[id]` : patient ou praticien du rendez-vous, connectés ; salle au nom secret ; ouverte 15 min avant, fermée 30 min après ; sans enregistrement ; salle d’exemple ouverte dès la réservation. Activation : `VIDEO_PROVIDER=livekit`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
- **Agenda** : fichier `.ics` joint aux emails et téléchargeable (`/api/rdv/[id]/agenda`) ; abonnement du praticien par lien secret (`/api/agenda/[id]/[jeton].ics`, jeton HMAC sans stockage) pour Google, Apple, Outlook. Synchronisation dans les deux sens : plus tard (vérification Google requise).
