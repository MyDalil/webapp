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
