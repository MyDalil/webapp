# Arborescence canonique de DALIL

Mise à jour : 15 novembre 2026. Ce document décrit les routes publiques, les accès membres et les espaces privés. Le registre exécutable est `src/platform/siteRoutes.ts` ; un test compare ce registre aux fichiers `page.tsx`.

## Domaines

| Usage | Adresse | Règle |
|---|---|---|
| Production canonique | `https://www.mydalil.com` | seule origine indexable |
| Domaine racine | `https://mydalil.com` | redirection 308 vers `www` |
| Preview | `https://preview.mydalil.com` | authentification Vercel, `noindex` |
| Alias technique principal | adresse Vercel automatique | redirection 308 vers `www`, chemin et paramètres conservés |
| Ancien prototype | adresse technique historique | accès public désactivé, source conservée |

Le français est servi sans préfixe. Les mêmes pages utilisent `/en` en anglais et `/ar` en arabe. Toute adresse `/fr/**` est redirigée vers la forme française sans préfixe.

## Pages publiques dédiées

| Domaine fonctionnel | Routes |
|---|---|
| Accueil | `/` |
| Annuaire | `/annuaire`, `/annuaire/[sector]`, `/annuaire/[sector]/[categorie]`, `/annuaire/[sector]/[categorie]/[wilaya]` |
| Adresses | `/adresses/[slug]`, `/villes/[slug]` |
| Santé | `/praticiens`, `/praticiens/[slug]` |
| Services | `/services`, `/services/[categorie]`, `/prestataires/[slug]` |
| Annonces | `/annonces`, `/annonces/[categorie]`, `/annonces/[categorie]/[slug]` |
| Démarches | `/demarches`, `/demarches/[slug]`, `/demarches/consulats`, `/demarches/theme/[theme]` |
| Guides et découverte | `/guides`, `/guides/[slug]`, `/explorer`, `/que-faire-ce-week-end` |
| Vie quotidienne | `/installation`, `/vie-pratique`, `/vie-musulmane`, `/business-emploi` |
| Accompagnement | `/accompagnement`, `/accompagnement/[slug]` |
| Confiance et contribution | `/label`, `/proposer` |
| Recherche | `/recherche` — publique mais non indexée |

## Connexion et comptes

| Usage | Route canonique | Visibilité |
|---|---|---|
| Connexion ou création par code email | `/connexion` | non indexée |
| Entrée particulier | `/connexion/particulier` | non indexée |
| Entrée professionnel | `/connexion/professionnel` | non indexée |
| Vérification | `/connexion/verifier` | non indexée |
| Ancienne réinitialisation | `/connexion/nouveau-mot-de-passe` | compatibilité, non indexée |
| Orientation après inscription | `/onboarding` | redirection contrôlée, non indexée |
| Compte personnel | `/mon-compte` | privée |
| Espace professionnel | `/espace-pro` | privé |
| Compatibilité ancien espace | `/espace` | redirection contrôlée |
| Mission | `/missions/[id]` | privée |
| Dépôt d'annonce | `/annonces/deposer` | privée |
| Messagerie d'annonce | `/annonces/messagerie` | privée |
| Newsletter | `/newsletter/confirmation`, `/newsletter/desinscription` | non indexées |

Alias permanents : `/login` et `/signin` → `/connexion` ; `/inscription` et `/signup` → `/connexion/particulier?tab=signup` ; `/mot-de-passe-oublie` → `/connexion` ; `/compte` → `/mon-compte` ; `/professionnels/espace` → `/espace-pro`. Les variantes `/en` et `/ar` conservent leur langue.

## Pages éditoriales historiques

Le routeur `/[...slug]` sert les routes versionnées dans `src/modules/contenus/routes.json`. Cette liste est la source exacte :

- `/`, `/actualites`, `/ar`, `/en`
- `/annuaire`, `/annuaire/administrations-services-publics`, `/annuaire/bien-etre-sport`, `/annuaire/commerces-achats`, `/annuaire/culture-nature-loisirs`, `/annuaire/droit-finance-conseil`, `/annuaire/education-formation`, `/annuaire/hebergement-sejours`, `/annuaire/logement-immobilier`, `/annuaire/maison-travaux`, `/annuaire/mosquees-priere`, `/annuaire/restaurants-gastronomie`, `/annuaire/sante-soins`, `/annuaire/transports-mobilite`
- `/adresses/darna-said-hamdine`, `/adresses/el-walima-alger`, `/adresses/house-of-burgers-bejaia`, `/adresses/latina-house-tlemcen`, `/adresses/le-tajine-el-biar`, `/adresses/le-village-annaba`, `/adresses/les-jumelles-oran`, `/adresses/lexcelsior-tlemcen`, `/adresses/mega-pizza-constantine`, `/adresses/yummy-pizza-constantine`
- `/guides`, `/guides/budget-et-banque`, `/guides/choisir-sa-ville`, `/guides/decouvrir-algerie`, `/guides/documents-et-demarches`, `/guides/ecole-et-famille`, `/guides/hajj-et-omra`, `/guides/internet-et-telecoms`, `/guides/logement`, `/guides/pharmacies`, `/guides/preparer-son-installation`, `/guides/restaurants`, `/guides/sante`, `/guides/services-du-quotidien`, `/guides/sorties-en-famille`, `/guides/transport`, `/guides/travail-et-entreprise`, `/guides/vie-musulmane`
- `/boutique`, `/business-emploi`, `/charte-professionnels`, `/conditions`, `/conditions-utilisation`, `/confidentialite`, `/cookies`, `/credits-photos`, `/demarches`, `/diagnostic`, `/explorer`, `/feedback`, `/installation`, `/label`, `/mentions-legales`, `/professionnels/espace`, `/professionnels/rejoindre`, `/proposer`, `/recherche`, `/rejoindre`, `/vie-pratique`

Les routes historiques remplacées par une page dédiée sont interceptées par cette page dédiée. Les espaces privés, formulaires et outils sont exclus du sitemap.

## Administration et services techniques

- `/admin/**` : Payload CMS et cockpit de l'équipe.
- `/api/**` : API applicative, webhooks et tâches planifiées.
- `/robots.txt`, `/sitemap.xml`, `/sitemaps/*.xml` : référencement.
- `/_next/**` : ressources internes Next.js.

Ces espaces ne sont jamais réécrits vers la langue française et ne figurent pas comme pages publiques dans le sitemap.
