# Santé — rendez-vous en ligne

Département responsable : **Product & UX + Trust**. Lire aussi `AGENTS.md` à la racine.

## Rôle
Prise de rendez-vous avec les praticiens, sur le modèle Doctolib : le praticien gère son agenda, le patient réserve un créneau libre confirmé immédiatement, rappel la veille, annulation ou déplacement en un clic. (Les établissements gardent la « demande simple » du module `messages`.)

## Contenu
- `Practitioners.ts` — fiche (spécialités, cabinet, langues, tarif, moyens de paiement), agenda (plages hebdomadaires en heure d’Alger, durée, délais, congés), vérification (identité, diplômes), statut `pending` → `published` par l’équipe uniquement, `owner` = compte pro.
- `Appointments.ts` — rendez-vous ; `slotKey` unique empêche la double réservation, vidé à l’annulation.
- `availability.ts` — moteur de créneaux pur et testé (`availability.test.ts`). Alger = UTC+1 sans heure d’été.
- `booking.ts` — recherche, créneaux libres, réservation/déplacement, annulation (délai du praticien), agenda pro, champs modifiables par le pro, rappels, suppression de compte.
- `emails.ts` — confirmation patient, notification praticien, annulation, rappel J-1.
- `ui/` — SlotPicker (réservation), MyAppointments (patient), ProSpace (fiche, horaires, agenda).
- Routes : `/api/rdv` (GET mes rendez-vous, POST réserver), `/api/rdv/creneaux`, `/api/rdv/[id]/annuler`, `/api/taches` (tâche quotidienne commune `vercel.json`, protégée par `CRON_SECRET`), `/api/pro/praticien`.
- Pages : `/praticiens`, `/praticiens/[slug]`, `/mon-compte`, `/espace-pro`.

## Règles propres
- **Compte vérifié obligatoire** pour réserver ; consentement explicite à chaque réservation (transmission au praticien).
- **DALIL n’encaisse rien** : tarif et moyens de paiement affichés, le patient paie le praticien directement.
- **Visio** : fournisseur non choisi (`platform/video.ts`). Tant que `VIDEO_PROVIDER` n’est pas défini, la visio est affichée « Bientôt » et n’est pas réservable. Aucun enregistrement, salle privée par rendez-vous.
- Le praticien modifie lui-même ses infos pratiques et son agenda ; nom, spécialités et diplômes ne changent qu’après vérification de l’équipe.
- Pratiques complémentaires signalées comme telles ; jamais de promesse d’efficacité. DALIL vérifie identité et diplômes, pas les méthodes.
- Motif court, sans détail médical. Suppression du compte = annulation des rendez-vous à venir + effacement.

## Conformité (à valider par un juriste)
Loi 18-07 (ANPDP) : déclaration/autorisation pour des données de santé, encadrement des transferts hors d’Algérie (Vercel, Neon, Resend, futur service visio), droits d’accès et d’effacement. RGPD pour les patients en Europe. Règles de télémédecine de la loi sanitaire : non vérifiées.

## Prochaines étapes
- Choisir le service visio (LiveKit Cloud recommandé) et implémenter `createVideoRoom`.
- Paiement en ligne via un prestataire qui reverse directement au praticien (à étudier).
- Limitation de débit sur `/api/rdv` et `/api/compte`.
