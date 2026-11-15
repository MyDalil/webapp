# Domaines et arborescence professionnelle — spécification

## Objectif

Faire de `https://www.mydalil.com` l'unique origine canonique, conserver `https://mydalil.com` comme redirection permanente et `https://preview.mydalil.com` comme environnement protégé, puis rendre l'arborescence publique, d'authentification et privée explicite, testée et sans doublon.

## Domaines

- `www.mydalil.com` est l'adresse canonique visible et indexable.
- `mydalil.com` redirige en 308 vers `www.mydalil.com`, chemin et paramètres conservés.
- `preview.mydalil.com` reste protégé par Vercel et interdit à l'indexation.
- L'alias Vercel automatique du projet principal redirige en permanence vers `www.mydalil.com`.
- L'ancien prototype n'est plus accessible au public ; sa source reste conservée.
- Les URL techniques de déploiement Vercel restent protégées.
- Canoniques, Open Graph, emails, robots et sitemaps utilisent la même origine selon l'environnement.

Une adresse `*.vercel.app` créée automatiquement par Vercel ne peut pas être supprimée physiquement : elle doit être neutralisée par protection ou redirection.

## Arborescence

- Pages publiques : accueil, annuaire, adresses, santé, services, annonces, démarches, guides, villes, vie pratique, vie musulmane, explorer et accompagnement.
- Authentification : `/connexion`, variantes particulier/professionnel, vérification et compatibilité de réinitialisation.
- Espaces privés : `/mon-compte`, `/espace-pro`, missions, dépôt et messagerie.
- Administration et API : `/admin/**` et `/api/**`, hors sitemap et hors réécriture linguistique.
- Français sans préfixe ; anglais `/en` ; arabe `/ar` ; `/fr/**` redirige vers la forme française.
- Les synonymes usuels redirigent vers une route existante ; ils ne créent aucun écran concurrent.

## Garanties

- Chemins et paramètres pertinents sont conservés.
- Aucune boucle entre racine, `www`, Preview et Vercel.
- Les routes privées restent absentes du sitemap.
- Un registre versionné classe toutes les pages dédiées ; un test détecte tout oubli.
- Le parcours de connexion par code email ne change pas.
- Aucun changement visuel ni migration de données.

## Livraison

Branche dédiée depuis `preview`, PR vers `preview`, vérification sur `preview.mydalil.com`, puis promotion vers `main` uniquement après le feu vert explicite de Radwan.
