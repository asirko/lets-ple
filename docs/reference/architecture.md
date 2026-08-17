# Architecture

Angular 22 multi-project workspace, composants standalone, signals, changement de détection
**zoneless**, builder `@angular/build` (esbuild). `projects/` est scindé en trois familles, chacune
générée avec un `--project-root` explicite car `newProjectRoot` d'`angular.json` ne peut pointer
qu'un seul emplacement :

```
projects/
├─ apps/
│  └─ portal/          seule app déployée : shell, accueil, catalogue des jeux, PWA, et
│                        /dev/components (showcase de composants)
├─ libs/
│  ├─ ui/                design system : tokens, LpButton/LpCard/LpPanel, a11y
│  └─ game-core/         socle commun à tous les jeux
└─ games/
   └─ cryptogramme/      le premier jeu, lui-même scindé en domain/, store/ et ui/
```

**Pourquoi ce découpage.** Un jeu est une library autonome exposant ses propres routes, chargée en
lazy par le portail — un seul build, un seul déploiement, une seule PWA, mais chaque jeu reste un
module isolé. Ajouter un jeu revient à créer une library sous `projects/games/` et à l'inscrire dans
`GAME_REGISTRY`, jamais à créer une application séparée.

## `game-core`

Ce que tout futur jeu partagera :

| Élément | Rôle |
|---|---|
| `GameDescriptor` | métadonnées d'un jeu pour le catalogue : id, titre, résumé, route, illustration, thèmes |
| `GAME_REGISTRY` | table des jeux et de leurs routes lazy |
| `I18nService` | chargement des dictionnaires JSON, résolution de clé avec interpolation — détail dans `docs/reference/i18n-storage.md` |
| `StorageService` | accès `localStorage` typé et versionné — détail dans `docs/reference/i18n-storage.md` |
| `ProgressService` | parties terminées, statistiques, préférences |

## Le showcase de composants

`/dev/components` (route lazy de `portal`, `projects/apps/portal/src/app/dev/`) est l'atelier de
composants — il a remplacé Storybook. Chaque composant UI (`libs/ui/src/lib/*` ou le dossier `ui/`
d'un jeu) porte un fichier `*.showcase.ts` à côté de son implémentation, qui exporte une constante
`LP_XXX_SHOWCASE` ; `DEV_ROUTES` (`dev.routes.ts`) déclare une route par composant, chacune
chargeant `ComponentPage` et son showcase en lazy via `loadShowcase`. `ShowcaseRenderer` monte le
composant dynamiquement (sans l'erreur Angular NG0950 que poserait un montage naïf) et génère des
contrôles de formulaire pour chaque prop déclarée. L'atelier remplit les mêmes rôles qu'avant :
développer un composant isolément, documenter les variantes du design system, servir de guide de
style (route `/dev/style`, ratios de contraste calculés).

## Convention : `tools/` racine vs `tools/` d'un jeu

Le `tools/` à la racine du dépôt est réservé aux scripts qui s'appliquent à tout le dépôt (aucun
pour l'instant, gardé en réserve). Un script qui ne concerne qu'un seul jeu — pipeline de contenu,
scoring de corpus, aides au scraping — vit dans le projet de ce jeu à la place, par exemple
`projects/games/cryptogramme/tools/`, à côté de `src/`. Le sortir de `src/` n'est pas cosmétique :
`tsconfig.lib.json` n'inclut que `src/**/*.ts`, donc tout ce qui est sous `tools/` est
automatiquement exclu de ce que `ng-packagr` empaquette dans la library publiée — un script Node
pur (`node:fs`, `process`, `tsx`) n'a rien à faire dans la surface d'une library Angular. Ne pas
ajouter de script spécifique à un jeu dans le `tools/` racine, ni dans `src/lib/` d'un jeu.

## Le moteur pur — `domain/`

`projects/games/cryptogramme/src/lib/domain/` n'a **aucune dépendance Angular ni RxJS** — c'est
l'invariant le plus important du projet. Il est vérifié par `domain/purity.spec.ts`, qui grep
chaque fichier du dossier à la recherche de `from '@angular/'` ou `from 'rxjs'` et fait échouer le
build s'il en trouve un. Ne jamais importer de type Angular dans `domain/`, même pour le typage :
état et transitions restent en TypeScript pur, pour que le moteur se teste en millisecondes et se
simule pour l'équilibrage.

Pipeline, chaque fichier à responsabilité unique :

```
rng.ts       générateur pseudo-aléatoire seedé (mulberry32) + mélange Fisher-Yates
alphabet.ts  texte → Sym[], gestion des accents (distinct vs merged), aides voyelles/fréquences
cipher.ts    buildCipher : bijection Sym → nombre
givens.ts    pickGivens : quels symboles démarrent pré-révélés
board.ts     buildBoard : texte + chiffrement + cadeaux → Cell[]
deck.ts      buildDeck : solution + cadeaux → pioche mélangée
game.ts      createGame/reduce : GameState, union d'Actions, les règles elles-mêmes
types.ts     types partagés Sym/AccentMode/Cell — pas de logique
```

`game.ts` orchestre les autres sans les réimplémenter. L'état est immuable : chaque `reduce()`
renvoie un nouvel objet, jamais de mutation de `board` ou `hand` en place.

Les règles du jeu (valeurs exactes) et l'invariant de solvabilité sont documentés dans
`docs/reference/domain-cryptogramme.md`, avec leur rationale — ce document-ci ne couvre que la
structure du code, pas le pourquoi des règles.

## La façade signals — `store/`

`projects/games/cryptogramme/src/lib/store/` (`GameStore`) est une façade signals au-dessus du
réducteur pur de `domain/game.ts` : elle ne contient aucune règle de jeu, chaque méthode construit
une `Action` et la passe à `reduce()`, puis expose l'état qui en résulte (`state`, `topCard`,
`canDraw`, `playableCells`) sous forme de signals pour les composants Angular. C'est la seule
couche du jeu qui a le droit de dépendre d'Angular au-dessus de `domain/`.

## Tests — deux runners, ne pas les confondre

- **Vitest** (`npm test`, config `vitest.domain.config.ts`) exécute tout ce qui est sous
  `projects/games/**/domain/**/*.spec.ts` et `projects/games/**/tools/**/*.spec.ts` dans un
  environnement Node pur — pas d'Angular, pas de DOM, démarre en millisecondes. C'est ici que se
  joue le cycle TDD du moteur, relancé des dizaines de fois par heure pendant le travail sur les
  règles.
- **`ng test`** exécute tout le reste (composants Angular, apps) via `@angular/build:unit-test`,
  qui paie ~15s de boot DOM/compilateur à chaque run. La cible `test` du projet `cryptogramme`
  exclut explicitement `**/domain/**` pour ne pas rejouer les mêmes specs sous le runner lent.

## PWA et service worker

Le portail est une PWA via `@angular/service-worker` (`^22.0.8` dans `package.json`), configuré par
`projects/apps/portal/ngsw-config.json`. Deux stratégies de cache selon le groupe de ressources :

- `app` (coquille applicative — `index.html`, CSS, JS, `favicon.ico`, `manifest.webmanifest`) :
  `installMode: prefetch` — téléchargée dès l'installation du service worker.
- `assets` (`/icons/**`) : `installMode: lazy`, `updateMode: prefetch`.
- `quotes` (`content/quotes/*.json`) : `installMode: lazy`, `updateMode: lazy` — le corpus n'est mis
  en cache qu'à la demande, jamais préchargé, et les mises à jour ne sont pas non plus anticipées.

**Piège non évident** : `npx ng add @angular/pwa --project portal` échoue sur Angular 22 — le
schematic résout une vieille version du package `@angular/pwa`, incompatible avec le builder
esbuild (`@angular/build`), et échoue avec une erreur du type « Main file (undefined) not found ».
La PWA a donc été câblée à la main plutôt que via ce schematic, en dépendant directement
d'`@angular/service-worker`.

`LpGameRoute` (`projects/games/cryptogramme/src/lib/ui/game-route/lp-game-route.ts`) est le point
d'entrée routé du jeu : il injecte `QuoteService`, appelle `loadTheme('litterature')`, puis
`pickRandomQuote(quotes)` pour résoudre une citation au hasard — c'est seulement une fois cette
citation résolue (signal `quote()` non nul) que `LpGamePage` est rendu, avec `quoteId`/`text`/
`author`/`source`/`seed` en inputs explicites.
