# DALIL

Le guide de confiance de l’Algérie.

Comprendre une démarche, découvrir un lieu ou trouver le bon interlocuteur : DALIL réunit un annuaire, des guides et des services organisés par métier.

[Ouvrir DALIL](https://www.mydalil.com/) · [Prévisualisation](https://preview.mydalil.com/) · [Consignes de développement](AGENTS.md)

## Ce dépôt

`MyDalil/webapp` contient le produit actuel : application Next.js, administration Payload CMS et modules métier. Les données sont hébergées dans Neon ; Vercel assure le déploiement web.

L’ancien projet Vercel `mydalil-prototype` conserve le prototype à l’adresse `dalil-algerie-public.vercel.app`. Il est distinct du projet Vercel actuel `mydalil` et ne doit pas remplacer son application ou ses données.

## Environnements

| Branche | Usage | Adresse |
| --- | --- | --- |
| `main` | Production | [www.mydalil.com](https://www.mydalil.com/) |
| `preview` | Intégration et validation | [preview.mydalil.com](https://preview.mydalil.com/) |

Les changements passent par une branche de tâche et une demande de fusion vers `preview`. La promotion vers `main` suit les contrôles et la validation produit décrits dans [AGENTS.md](AGENTS.md).

## Organisation

| Dossier | Rôle |
| --- | --- |
| `src/app/` | Pages et routes de l’application. |
| `src/modules/` | Fonctionnalités organisées par métier. |
| `src/platform/` | Authentification, stockage et composants partagés. |
| `src/rubriques/` | Règles éditoriales et sources par rubrique. |
| `src/migrations/` | Historique des évolutions de la base. |
| `.agents/skills/` | Savoir-faire de développement existant. |

Le visuel de référence est `src/styles/mockup.css` ; les contenus et fonctions du prototype restent dans `src/modules/contenus/`.

## Développer

Lire [AGENTS.md](AGENTS.md), puis les consignes du module concerné. `CLAUDE.md` importe les mêmes règles ; elles sont utilisables par un humain comme par les autres outils de développement.

```sh
pnpm dev
pnpm check
pnpm test
pnpm build
pnpm test:e2e
```

La configuration locale et les contrôles de base de données sont décrits dans [AGENTS.md](AGENTS.md). Les secrets restent hors du dépôt.
