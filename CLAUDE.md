# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Let's Plé** — a French-language word-game portal (PWA, static, deployed to GitHub Pages). The
first game is a **cryptogramme**: a quote where every letter is replaced by a number, to be
reconstructed by drawing letter-cards from a capped hand.

Design and rationale live in `docs/superpowers/specs/2026-07-28-lets-ple-cryptogramme-design.md`.
The step-by-step build plan (mostly executed already — check `git log` for current progress) is in
`docs/superpowers/plans/2026-07-28-lets-ple-v1.md`. Read the spec before making game-rule decisions;
it documents *why*, not just *what*.

CSS follows a SMACSS convention — read `docs/conventions/css.md` before writing or editing any
style. In short: almost all style is global (`libs/ui/src/styles/`, one module file per shared
component, one per-game module under that game's own `src/styles/`); a component's `styleUrl`
holds only the positioning between its own child elements, never color/typography/borders/shadows.
Rationale in `docs/superpowers/specs/2026-07-28-architecture-css-smacss-design.md`.

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
```

There is no root-level `ng serve`/`ng build` without a project name — `angular.json` intentionally
has no `defaultProject`; always pass `portal` (or `storybook`) explicitly, or use the npm scripts.

### Two separate test runners — don't mix them up

- **Vitest** (`npm test`, config `vitest.domain.config.ts`) runs everything under
  `projects/games/**/domain/**/*.spec.ts` and `projects/games/**/tools/**/*.spec.ts` in a plain Node
  environment —
  no Angular, no DOM, starts in milliseconds. This is where the game engine's TDD cycle happens and
  where it should stay; it's rerun dozens of times an hour during rule work.
- **`ng test`** runs everything else (Angular components, apps) via `@angular/build:unit-test`,
  which pays ~15s of DOM/compiler boot per run. The `cryptogramme` project's `test` target
  explicitly excludes `**/domain/**` to avoid double-running the same specs under the slow runner.

## Architecture

Angular 22 multi-project workspace, standalone components, signals, **zoneless** change detection,
`@angular/build` (esbuild) as the builder. `projects/` is split into three families, each generated
with an explicit `--project-root` because `newProjectRoot` can only point at one location:

```
projects/
├─ apps/
│  ├─ portal/          the only deployed app: shell, home, game catalogue, PWA
│  └─ storybook/        build-context-only app for the Storybook workshop — no business logic
├─ libs/
│  ├─ ui/                design system: tokens, LpButton/LpCard/LpPanel, a11y
│  └─ game-core/         cross-game plumbing: GameDescriptor, GAME_REGISTRY, I18nService, StorageService, ProgressService
└─ games/
   └─ cryptogramme/      the first game, itself split into domain/ and ui/
```

A game is a lazy-loaded library with its own routes, not a separate app — one build, one
deployment, one PWA. `game-core` is what every future game will share; adding a game means adding a
library under `projects/games/` and registering it in `GAME_REGISTRY`.

### Convention: root `tools/` vs a game's own `tools/`

Root-level `tools/` is for scripts that apply across the whole repo (none yet, kept in reserve).
A script that only makes sense for one game — content pipelines, corpus scoring, scraping aids —
lives under that game's project instead, e.g. `projects/games/cryptogramme/tools/`, sibling to
`src/`. Keeping it out of `src/` matters, not just cosmetic: `tsconfig.lib.json` only includes
`src/**/*.ts`, so anything under `tools/` is automatically excluded from what `ng-packagr` bundles
into the published library — a Node-only script (using `node:fs`, `process`, `tsx`) has no business
being part of the Angular library surface. Don't add game-specific scripts to the root `tools/`;
don't put them inside `src/lib/` either.

### The domain/ubi rule — the one invariant that matters most

`projects/games/cryptogramme/src/lib/domain/` is a **pure engine with zero Angular (or RxJS)
dependency**. This is enforced by `domain/purity.spec.ts`, which greps every file in that directory
for `from '@angular/` or `from 'rxjs'` and fails the build if it finds one. Never import Angular
types into `domain/`, even for typing convenience — state and transitions belong in plain
TypeScript so the engine can be tested in milliseconds and simulated for balancing.

Pipeline inside `domain/`, each file single-purpose (see file headers for exact contracts):

```
rng.ts       seeded PRNG (mulberry32) + Fisher-Yates shuffle — all engine randomness goes through this
alphabet.ts  text → Sym[], accent handling (distinct vs merged), vowel/frequency helpers
cipher.ts    buildCipher: bijection Sym → number
givens.ts    pickGivens: which 2-3 symbols start pre-revealed (frequency-weighted, ≥1 vowel guaranteed)
board.ts     buildBoard: text + cipher + givens → Cell[] (one cell per character, fixed vs letter)
deck.ts      buildDeck: solution + givens → shuffled draw pile (one card per empty letter cell)
game.ts      createGame/reduce: GameState, Action union, the actual rules (draw/play/win/lose)
types.ts     shared Sym/AccentMode/Cell types — no logic
```

`game.ts` orchestrates the others; it does not reimplement them. State is immutable — every
`reduce()` call returns a new object, never mutates `board` or `hand` in place.

**Core invariant** (checked continuously in `invariants.spec.ts` across ~50 seeds ×
4 quote shapes): `|deck| + |hand| = number of empty letter cells`, and the top card of the hand
always has at least one valid, correct cell to land on. Because the deck is exactly the multiset of
remaining answers, no game state is ever unsolvable — a stuck player is an *information* problem
(which cell is correct?), never a mechanical dead end. Any change to `game.ts`, `deck.ts`, or
`givens.ts` should be re-verified against this test, not just its own unit tests.

Game rules with exact values (do not casually change without checking the spec's rationale):
hand capacity 5 (LIFO — only the top card is playable), max errors 3, 2-3 givens, `accentMode`
defaults to `'distinct'` (accented letters are distinct symbols from their base letter).

### Corpus and difficulty scoring

`content/quotes/*.json` holds hand-curated quotes per theme (`litterature`, `historique`,
`scientifique`, `pop-culture`), validated against
`projects/games/cryptogramme/tools/quote-schema.ts` by
`projects/games/cryptogramme/tools/validate-quotes.ts` (uniqueness of `id`, non-empty
`author`/`source`, `notoriety` 1-5, `publicDomain` required — citation-right compliance depends on
`source`/`publicDomain` being present, not optional).

`projects/games/cryptogramme/tools/difficulty.ts` computes a composite score (occurrences per
symbol, rare-symbol ratio, short-word ratio, frequency divergence from standard French, distinct
symbol count, notoriety) with weights externalized in `difficulty-weights.json` (same folder) so
they can be recalibrated without code changes. `npm run score:quotes` writes the resulting
`difficulty: { score, tier, factors }` block back into each quote file — this is pre-computed at
build/edit time, never recalculated at runtime. Tests for this module assert monotonicity
properties (e.g. "more rare symbols ⇒ higher score"), not fixed values, since the weights are
expected to shift during balancing.

`projects/games/cryptogramme/tools/extract-wikiquote-citations.ts` is a standalone scraping aid,
not part of the validated pipeline, and not wired to an npm script — its output is low-signal (see
below) and needs heavy manual curation before quotes are added to `content/quotes/`. Run it
directly with `npx tsx` if needed.

### i18n and storage conventions

UI strings are never hardcoded in templates — everything resolves through `I18nService` from JSON
dictionaries (`i18n/fr.json`), interpolating `{n}` and falling back to the raw key if missing (a
missing key should be visible, not crash). French-only for now, but the indirection is deliberate:
adding a language later means adding a dictionary, not touching components. `StorageService` wraps
`localStorage` behind versioned, prefixed keys and falls back to an in-memory map when
`localStorage` is unavailable (private browsing).
