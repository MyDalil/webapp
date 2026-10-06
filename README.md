# DALIL — webapp

Le guide de confiance de l’Algérie — www.mydalil.com.

Toute la documentation de travail est dans **`AGENTS.md`** (règles communes, organisation par métier, infrastructure, commandes), puis dans le `AGENTS.md` de chaque module (`src/modules/<métier>/`) et du socle (`src/platform/`). Ces fichiers sont lisibles par n’importe quel agent IA comme par un humain.

- Visuel : maquette validée (`src/styles/mockup.css`) ; contenus et fonctions : prototype (`src/modules/contenus/`).
- `main` = production, `preview` = test (preview.mydalil.com). Jamais de push direct sur `main`.
- `pnpm dev`, `pnpm check` (frontières + types), `pnpm build`.
