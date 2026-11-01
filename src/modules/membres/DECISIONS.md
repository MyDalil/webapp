# Décisions — Membres

Format : `- AAAA-MM-JJ — décision — raison`. Ne jamais réécrire une entrée : en ajouter une nouvelle qui la remplace.

- 2026-10-06 — module créé lors de la réorganisation par métiers — chaque métier évolue indépendamment avec sa mémoire.
- 2026-10-06 — deux types de comptes publics : Particulier et Professionnel (pas de Contributeur vérifié) — décision de Rad.
- 2026-10-06 — un seul compte par personne (un email, un mot de passe) ; l’espace Professionnel s’ajoute au compte Particulier — évite doublons et double connexion. Décision de Rad.
- 2026-10-17 — fin du profil test : favoris, listes, préparation, parcours et demandes rattachés au compte membre ; une seule page Mon compte (profil ville + intérêts, favoris, listes) ; /espace, /test, /onboarding y renvoient ; « Voir les coordonnées » retiré des fiches sans coordonnées vérifiées — décisions de Rad.
- 2026-10-31 — connexion et inscription par code à 6 chiffres envoyé par email (Resend), sans mot de passe ; une seule entrée `/connexion` sur ordinateur et mobile ; Particulier ou Professionnel se choisit à l’inscription — décision de Rad (apps actuelles, plus simple). Défi signé HMAC (`otpCore.ts`, testé), sans table : essais limités (6/10 min par email), défi à usage unique, 5 codes/h par email. À la connexion, le mot de passe du compte est remplacé par une valeur aléatoire : l’ancien mot de passe ne sert plus.
