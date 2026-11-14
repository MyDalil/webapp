# Cockpit admin — Lot 1 : socle et vue Pilotage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'habillage natif de Payload par la coquille du cockpit DALIL (menu, barre de commande, thème clair/sombre, FR/AR/EN) et faire de l'accueil `/admin` la vue Pilotage branchée sur Neon.

**Architecture:** On garde Payload 3.93 comme moteur. La coquille passe par ses points d'extension officiels : `admin.components.Nav` (menu), `admin.components.actions` (barre du haut), `admin.components.views.dashboard` (Pilotage). Les écrans natifs de collections restent, habillés par les mêmes jetons CSS (variables `--theme-*` de Payload redéfinies). La logique (menu, indicateurs) est pure et testée ; les composants ne font qu'afficher.

**Tech Stack:** Next.js 16.4, Payload 3.93 (`@payloadcms/next`, `@payloadcms/ui`), React 19.3, `motion` 14, Vitest, Playwright.

**Spec:** maquettes « DALIL Admin — maquettes » (écran 1 Pilotage, écran 6 Mobile) ; `docs/superpowers/plans/2026-11-14-cockpit-admin-feuille-de-route.md`.

## Global Constraints

- Couleurs : vert `#006b3c` (clair) / `#38d181` (sombre) ; fond sombre `#06110d` ; rubriques Santé `#1A56DB`, Services `#6D28D9`, Annonces `#BE185D`, Vie musulmane `#0F7A4A`, Découvrir `#C2410C`, Vie pratique `#CA8A04` (admin seulement ; le site garde `#FACC15`).
- Polices : Manrope (titres), Inter (texte, chiffres tabulaires), IBM Plex Sans Arabic (AR, déjà utilisée par le site).
- Langue de l'admin : `fr` par défaut, `ar` (RTL) et `en` disponibles.
- Une seule barre de recherche visible à l'écran.
- Contraste ≥ 4,5:1 ; cibles tactiles ≥ 44 px sur mobile ; `prefers-reduced-motion` respecté.
- Vérification à 375 px et 1440 px, en clair et en sombre.
- Vie musulmane : entrée de menu marquée « Saïd seul » ; jamais proposée à un agent.
- Le module propriétaire est `pilotage` ; `src/platform` n'importe aucun module (`scripts/check-boundaries.mjs`).

## Review Focus

1. Compte `conseiller` : ne doit voir que l'accompagnement dans le menu, jamais les autres entrées → test `navFor` (Tâche 1).
2. Base vide (preview neuve) : Pilotage affiche des zéros, aucune erreur → test `getPilotageKpis` avec comptes à 0 (Tâche 3).
3. Une collection en erreur (requête qui échoue) : l'indicateur affiche « — », la vue reste debout → test (Tâche 3).
4. Arabe : la coquille passe en RTL (menu à droite), sans texte coupé → e2e à 375 px (Tâche 5).
5. Mode sombre choisi puis rechargement : le choix persiste (préférence Payload) → e2e (Tâche 5).

---

### Task 1: Modèle du menu

**Files:**
- Create: `src/modules/pilotage/admin/nav.ts`
- Test: `src/modules/pilotage/admin/nav.test.ts`

**Interfaces:**
- Produces: `type NavItem = { key: string; label: string; href: string; icon: IconName; badgeKey?: BadgeKey; lockedForAgents?: true }`, `type NavGroup = { key: string; label: string; items: NavItem[] }`, `NAV_GROUPS: NavGroup[]` (7 groupes, 29 entrées, ordre de la maquette), `navFor(role: 'patron'|'admin'|'editor'|'conseiller'): NavGroup[]`, `type BadgeKey = 'validation'|'taches'|'moderation'|'pros'|'inbox'|'traductions'|'activite'`.

- [ ] **Step 1: Tests**
  - `NAV_GROUPS` a 7 groupes : Pilotage, Agents, Contenu, Communauté, Communication, Business, Système.
  - L'entrée `vie-musulmane` a `lockedForAgents: true`.
  - `navFor('conseiller')` ne contient qu'une entrée, `href` = `/admin/collections/demandes-accompagnement`.
  - `navFor('editor')` n'a pas le groupe Système.
  - Chaque `href` commence par `/admin`.
- [ ] **Step 2:** `pnpm vitest run src/modules/pilotage/admin/nav.test.ts` → FAIL.
- [ ] **Step 3:** Écrire `nav.ts`. Les entrées sans écran dédié (lots 5 à 10) pointent vers la collection Payload existante ; les autres vers `/admin/cockpit/<clé>`.
- [ ] **Step 4:** Relancer → PASS.
- [ ] **Step 5:** Commit `feat(pilotage): modèle du menu du cockpit`.

### Task 2: Jetons, thème et polices

**Files:**
- Create: `src/modules/pilotage/admin/cockpit.scss`
- Modify: `src/app/(payload)/custom.scss` (une ligne `@use`)

**Interfaces:**
- Produces: variables `--dl-g`, `--dl-bg`, `--dl-s`, `--dl-s2`, `--dl-s3`, `--dl-ln`, `--dl-tx`, `--dl-mu`, `--dl-wa`, `--dl-da`, `--dl-in` et leurs `-soft` ; classes `.dl-card`, `.dl-pill(.ok|.wa|.da|.in)`, `.dl-btn(.pri|.gh)`, `.dl-bar`. Valeurs = celles de la maquette.

- [ ] **Step 1:** Définir les jetons sous `html[data-theme='light']` et `html[data-theme='dark']` (attribut posé par Payload).
- [ ] **Step 2:** Mapper `--theme-bg`, `--theme-elevation-0…1000`, `--theme-success-*`, `--theme-error-*`, `--font-body` de Payload sur ces jetons, pour habiller aussi les écrans natifs.
- [ ] **Step 3:** `[dir='rtl']` : Noto Sans Arabic en tête de `--font-body`.
- [ ] **Step 4:** `pnpm build` → OK.
- [ ] **Step 5:** Commit `feat(pilotage): jetons du cockpit, clair et sombre`.

### Task 3: Indicateurs de Pilotage

**Files:**
- Create: `src/modules/pilotage/kpis.ts`
- Test: `src/modules/pilotage/kpis.test.ts`

**Interfaces:**
- Produces: `type Counter = (collection: string, where?: Where) => Promise<number>`, `type Kpi = { key: KpiKey; value: number | null; label: string; href: string; tone: 'ok'|'wa'|'da'|'in' }`, `getPilotageKpis(count: Counter, now: Date): Promise<Kpi[]>` (8 indicateurs), `getBadges(count: Counter): Promise<Record<BadgeKey, number>>`.
- Sources : visiteurs 24 h = `visitor-sessions` ; à valider = `agent-tasks` statut `review` ; boîte = `submissions` non traitées ; fiches = `places` publiées et à vérifier ; signalements = `classifieds` « à contrôler » + `provider-reviews` signalés ; coût IA = somme `ai-usage` du mois ; santé = `error-logs` non résolues 24 h ; membres = `members`.

- [ ] **Step 1: Tests**
  - Avec un `count` qui renvoie toujours 0 : 8 KPI, toutes `value === 0`.
  - Avec un `count` qui rejette pour `ai-usage` : ce KPI `value === null`, les 7 autres présents.
  - Les filtres de date utilisent `now - 24 h` (vérifier l'argument `where` reçu).
- [ ] **Step 2:** Lancer → FAIL.
- [ ] **Step 3:** Écrire `kpis.ts` avec `Promise.allSettled`.
- [ ] **Step 4:** Lancer → PASS.
- [ ] **Step 5:** Commit `feat(pilotage): indicateurs du cockpit`.

### Task 4: Menu, barre du haut et vue Pilotage

**Files:**
- Create: `src/modules/pilotage/admin/CockpitNav.tsx` (serveur), `src/modules/pilotage/admin/CockpitBar.tsx` (client : barre ⌘K, langue, thème, notifications), `src/modules/pilotage/admin/PilotageView.tsx` (serveur), `src/modules/pilotage/admin/icons.tsx`
- Modify: `src/payload.config.ts` (`admin.components.Nav`, `admin.components.actions`, `admin.components.views.dashboard`, `i18n.supportedLanguages` += `ar`, `en`), `src/app/(payload)/admin/importMap.js` (régénéré par `pnpm payload generate:importmap`)

**Interfaces:**
- Consumes: `navFor`, `NAV_GROUPS` (Tâche 1) ; `getPilotageKpis`, `getBadges` (Tâche 3).
- `Counter` concret : `(c, where) => payload.count({ collection: c, where, overrideAccess: false, req }).then(r => r.totalDocs)`.

- [ ] **Step 1:** `CockpitNav` : groupes, entrée active, badges, cadenas Vie musulmane, carte « Arrêt général » (lit le global `controls`).
- [ ] **Step 2:** `CockpitBar` : ⌘K ouvre la palette (navigation + recherche dans `places`, `providers`, `classifieds`, `members` via `/api/<collection>?where[...]`) ; langue via `useTranslation().switchLanguage` ; thème via `useTheme().setTheme`.
- [ ] **Step 3:** `PilotageView` : salutation, 8 KPI, cartes des six univers (comptes `places` par rubrique), « À valider » (5 dernières `agent-tasks` en `review`). Les blocs Agents, Couverture et Fil d'activité arrivent aux lots 3, 5 et 10 : ils n'apparaissent pas tant que leurs données n'existent pas.
- [ ] **Step 4:** `pnpm payload generate:importmap && pnpm check && pnpm build` → OK.
- [ ] **Step 5:** Commit `feat(pilotage): coquille du cockpit et vue Pilotage`.

### Task 5: Parcours e2e

**Files:**
- Create: `e2e/cockpit.spec.ts`

- [ ] **Step 1: Tests** (compte admin de test de la CI)
  - `/admin` affiche « Bonjour » et 8 indicateurs à 1440 px.
  - À 375 px, le menu s'ouvre par le bouton et ses cibles font ≥ 44 px.
  - Thème sombre choisi → rechargement → `html[data-theme='dark']`.
  - Langue `ar` → `html[dir='rtl']` et le menu est à droite.
  - Compte `conseiller` → une seule entrée de menu.
- [ ] **Step 2:** `pnpm build && pnpm test:e2e e2e/cockpit.spec.ts` → PASS.
- [ ] **Step 3:** Mettre à jour `docs/agent-handoff.md` et `src/modules/pilotage/DECISIONS.md`.
- [ ] **Step 4:** Commit `test(pilotage): parcours du cockpit`, puis PR vers `preview`.
