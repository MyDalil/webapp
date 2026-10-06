---
name: annuaire-ajouter-une-adresse
description: Ajouter ou compléter une adresse de l’annuaire DALIL dans /admin (fiche, localisation, photos, publication).
---

# Ajouter ou compléter une adresse de l’annuaire DALIL dans /admin (fiche, localisation, photos, publication)

1. /admin → Annuaire → Adresses → Créer (ou ouvrir la fiche).
2. **Fiche** : nom, secteur, catégorie (une des catégories du secteur, voir `src/platform/referentiel/catalog.ts`), présentation factuelle de 2–3 phrases, photos (la première = couverture, texte alternatif obligatoire, crédit si connu).
3. **Localisation** : wilaya, ville, quartier/repère, adresse ; latitude/longitude depuis OpenStreetMap ou Google Maps (aide intégrée sous les champs). Sans coordonnées, la carte affichera une position approximative.
4. **Contacts & horaires** : seulement des informations confirmées ; laisser vide plutôt que deviner.
5. **Vérification** : laisser « Repérée — à vérifier » tant qu’aucune vérification n’a eu lieu (voir la skill `confiance-verifier-une-fiche`).
6. Aperçu → vérifier la page → Publier. La page publique se met à jour immédiatement.
