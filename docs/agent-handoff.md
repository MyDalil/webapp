# Reprise — 12 novembre 2026

## Mise à jour — 14 novembre 2026 (soir) : écoles et photos des lieux publics

- PR #31 `agent/guides-annuaire-ecoles` → `preview` : les guides liés à une rubrique de l’annuaire montrent ses catégories non vides et 6 adresses. Cause corrigée : « École & famille » (Vie pratique) ne menait à aucune école. `pnpm check` OK ; build/e2e laissés à la CI.
- PR #32 (brouillon) `agent/photos-lieux-publics` → `preview` : collecte `scripts/import/fetch-place-photos.mjs` (workflow « Photos libres des lieux publics », lancé au push) puis migration différée `20261114_230000_photos_lieux_publics`.
- Sources : Wikidata, OpenStreetMap (wikimedia_commons), Commons géographique avec contrôle du nom. Pas de réseaux sociaux (conditions de Meta, droit d’auteur, décision annuaire du 2026-10-08).
- Prochaine action : attendre la fin du workflow (commit de `src/modules/annuaire/data/place-photos.json`), relire le volume trouvé, passer la PR #32 en prête, CI, test sur preview.
- Limite connue : les sources libres couvrent peu les écoles et mosquées de quartier. Couverture complète : Mapillary (compte à créer) ou Google Places (payant) — décision de Rad attendue.

## Mise à jour — 14 novembre 2026

- `MyDalil/webapp` reste inchangé comme dépôt canonique et reste sur GitHub Free.
- La règle racine impose désormais une branche dédiée à chaque agent, une pull request vers `preview` et aucune écriture directe sur `preview` ou `main`.
- Aucun code produit, secret, service cloud ni déploiement n'est modifié par ce lot.

- Chantier : rangement du dépôt et continuité entre outils de développement.
- Référence applicative avant ce changement documentaire : `preview`, `f9f538db902d9f8cdcabec247fa36b6cae9cdb60`.
- Documentation de travail : `AGENTS.md`, instructions et journaux des modules concernés.
- Ce lot modifie uniquement la documentation ; aucun skill ni réglage de permissions n’est ajouté.
- Relire les contrôles et les déploiements sur la révision courante avant toute livraison.
- Prochaine action : vérifier la branche, le diff et la dernière décision du module avant de poursuivre la tâche confiée.
- Aucun changement applicatif, migration ou lancement n’est attesté par ce rangement.
