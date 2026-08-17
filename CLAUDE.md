# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AVERTISSEMENT — ne pas rendre le jeu public tant que ce point n'est pas réglé

`content/quotes/*.json` contient ~12 515 citations (voir
`projects/games/cryptogramme/tools/import-quotekg-candidates.ts`), dont seules ~1 710 portent
`publicDomain: true` vérifié à la main (auteurs morts depuis plus de 70 ans en France, prorogations
de guerre comprises). Les ~10 795 restantes ont `publicDomain: false` par défaut **prudent** — leur
statut réel n'est pas tranché, pas confirmé « non couvert ».

Le droit de citation français (art. L122-5 CPI, « exception de courte citation ») ne couvre **pas**
cet usage : il exige une citation courte *relativement à l'œuvre citée* et son incorporation dans un
propos critique, polémique, pédagogique, scientifique ou d'information — ce qu'un jeu de
reconstruction de citation n'est pas. `publicDomain` reste donc le seul filtre légitime pour ce qui
peut être exposé publiquement, mais **le code ne l'exploite pas encore** : usage strictement
personnel/local pour l'instant, aucun filtrage à l'exécution.

**Ne pas déployer publiquement (GitHub Pages, push vers un remote public, lien partagé) et ne pas
pousser de commit touchant `content/quotes/` vers `origin` tant que l'un des deux n'est pas fait** :
soit filtrer le contenu réellement servi sur `publicDomain: true`, soit compléter la revue manuelle
de `AUTHOR_OVERRIDES` (`import-quotekg-candidates.ts`) pour le reste du corpus.

## Project

**Let's Plé** — a French-language word-game portal (PWA, static, deployed to Firebase Hosting). The
first game is a **cryptogramme**: a quote where every letter is replaced by a number, to be
reconstructed by drawing letter-cards from a capped hand.

Design and rationale for the game rules live in `docs/reference/domain-cryptogramme.md` — read it
before making game-rule decisions; it documents *why*, not just *what*. The workspace's structure
(apps/libs/games split, the `domain/` engine pipeline, `game-core`) is documented in
`docs/reference/architecture.md`.

CSS follows a SMACSS convention — read `docs/conventions/css.md` before writing or editing any
style. In short: almost all style is global (`libs/ui/src/styles/`, one module file per shared
component, one per-game module under that game's own `src/styles/`); a component's `styleUrl`
holds only the positioning between its own child elements, never color/typography/borders/shadows.

Components follow a UI-first-in-the-showcase convention — read `docs/conventions/components.md`
before designing or building any component. In short: a UI component (`libs/ui/src/lib/*`, or a
game's own `ui/` folder) is designed and built in the component showcase (`/dev/components`)
first, and carries most of its own visual style. A logic component (a screen, an assembler) only composes UI components together and
has almost no style of its own — a tiny bit of local positioning is tolerated, nothing else.
Elements of style shared across components live in the global app style, not in either.

Commits follow `type(scope): sujet` (Conventional Commits, scope = touched area, subject without
accents) — read `docs/conventions/commits.md` before writing a commit message. The body, when
present, explains *why*, never restates the diff.

## Project tracking

Backlog and status live on GitHub, not in this file — check them at the start of planning/work,
they change faster than docs get updated. Use the `gh` CLI directly (already authenticated on this
machine); no MCP/plugin needed.

- **Issues** (`gh issue list --repo asirko/lets-ple`): one per epic/feature/chore. Label
  `future-game` marks candidate games not yet designed (see issue #1); standard GitHub labels
  otherwise (`bug`, `enhancement`, ...).
- **Project board** (`gh project item-list 5 --owner asirko`, or
  https://github.com/users/asirko/projects/5 — private, unlike issues): three columns, Backlog /
  En cours / Terminé. Also holds draft cards for plan-v1 tasks already done (Tâche 1-17), kept as
  history — no real issues were opened for those.
- **Milestones**: `scaffolding` (initial build — engine, corpus, portal, PWA, deployment via
  **Firebase Hosting**, see `docs/reference/deployment-firebase.md` — that deployment is not
  public, no shared link or announcement, so it doesn't lift the AVERTISSEMENT above, which still
  applies to any future public dissemination of the link) and `affinage cryptogramme` (ongoing
  balancing/corpus/UI work on the cryptogramme once scaffolding is done, empty for now).

This is the source of truth for *what's next* and *what's in progress*. `docs/reference/` is the
source of truth for *how* the system works once a feature is built — see `## Documentation` below.
`docs/superpowers/` holds only specs/plans for work still in progress; see
`docs/conventions/documentation.md` for how they get folded into `docs/reference/` once done.

## Commands

Node ≥ 24.15.0 is required (Angular 22 refuses to install below it).

```bash
npm start                      # ng serve portal — this is a multi-project workspace, always name the project
npm run build                  # ng build portal
npm test                       # vitest run — domain engine + tools, NOT the Angular apps
npm run test:watch             # vitest --watch, same scope
npx vitest run rng             # run a single domain spec file by name fragment
npm run test:ng                # ng test — Angular component/app tests (separate runner, slow to boot)
npm run test:all               # both of the above
npm run validate:quotes        # validates content/quotes/*.json against the cryptogramme tools' quote-schema.ts
npm run score:quotes           # recomputes and writes the `difficulty` block into content/quotes/*.json
npm run extract:quotes         # pulls raw candidate quotes from QuoteKG into quotekg-citations.json (gitignored)
npm run filter:quotes          # applies the quality threshold, writes content/quote-candidates/quotekg.json
npm run build:cryptogramme     # builds libs/ui first, then the cryptogramme library in isolation — see below
npm run docs                   # publie la doc Compodoc en site statique autonome (./documentation, gitignored)
```

There is no root-level `ng serve`/`ng build` without a project name — `angular.json` intentionally
has no `defaultProject`; always pass `portal` (or `ui`) explicitly, or use the npm scripts.

Building a game library **in isolation** (`ng build cryptogramme`, e.g. to sanity-check it outside
the portal) needs `npm run build:cryptogramme`, not the raw `ng build cryptogramme` command: the
root `tsconfig.json` maps `@lets-ple/ui` to `libs/ui`'s **sources**, which ng-packagr refuses to
compile into a different package's isolated build (`TS6059`, sources outside that package's
`rootDir`). `projects/games/cryptogramme/tsconfig.lib.json` overrides that one path to point at
`dist/ui`'s compiled `.d.ts` instead, so `dist/ui` must be built and current first — that's what
`npm run build:cryptogramme` does. The portal build (`npm run build`) is unaffected: it always
resolves `@lets-ple/ui` to sources, exactly as before.

Two separate test runners exist (Vitest for `domain/`/`tools/`, `ng test` for everything else) —
see `docs/reference/architecture.md` before running or writing tests.

## Documentation

`docs/reference/` holds the durable, topic-organized knowledge about how the system works and why
— read only the file relevant to what you're about to touch, not all of them upfront:

- **Architecture** (workspace layout, the `domain/` engine pipeline, purity rule, `tools/`
  convention, test runners) — `docs/reference/architecture.md`, read before touching project
  structure or `domain/`.
- **PWA and service worker** (cache strategy per resource group, the `ng add @angular/pwa` trap on
  Angular 22, how a random quote gets resolved before the game renders) —
  `docs/reference/architecture.md`, read before touching `ngsw-config.json` or the game route.
- **Cryptogramme rules** (exact values, solvability invariant, rationale) —
  `docs/reference/domain-cryptogramme.md`, read before any game-rule decision.
- **Corpus and citation pipeline** (schema, difficulty scoring, QuoteKG extraction, public-domain
  status) — `docs/reference/corpus-pipeline.md`, read before touching `content/quotes/` or its
  tools.
- **Deployment** (Firebase Hosting, CI/CD, DNS) — `docs/reference/deployment-firebase.md`, read
  before touching CI or Firebase configuration.
- **i18n and storage** — `docs/reference/i18n-storage.md`, read before touching `I18nService` or
  `StorageService`.

`docs/conventions/` holds how-to-write-code rules: `commits.md`, `components.md`, `css.md`, and
`documentation.md` (the lifecycle that keeps `docs/reference/` and `docs/superpowers/` from
drifting apart — read it before closing any task that produced a spec or plan under
`docs/superpowers/`).
