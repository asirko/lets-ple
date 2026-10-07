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
   ├─ cryptogramme/      jeu de reconstruction de citations
   ├─ dernier-mot/       jeu multijoueur de préfixes, dictionnaire local et tools de corpus
   └─ quiz/              quiz géographie, moteur pur et données locales sous content/geography
```

**Pourquoi ce découpage.** Un jeu est une library autonome exposant ses propres routes, chargée en
lazy par le portail — un seul build, un seul déploiement, une seule PWA, mais chaque jeu reste un
module isolé. Ajouter un jeu revient à créer une library sous `projects/games/` et à l'inscrire dans
`GAME_REGISTRY`, jamais à créer une application séparée.

## `game-core`

Ce que tout futur jeu partagera :

| Élément           | Rôle                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `GameDescriptor`  | métadonnées d'un jeu pour le catalogue : id, titre, résumé, route, illustration, thèmes                                |
| `GAME_REGISTRY`   | table des jeux et de leurs routes lazy                                                                                 |
| `I18nService`     | chargement des dictionnaires JSON, résolution de clé avec interpolation — détail dans `docs/reference/i18n-storage.md` |
| `StorageService`  | accès `localStorage` typé et versionné — détail dans `docs/reference/i18n-storage.md`                                  |
| `ProgressService` | parties terminées, statistiques, préférences                                                                           |

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

## Les moteurs purs — `domain/`

Les dossiers `projects/games/*/src/lib/domain/` n'ont **aucune dépendance Angular ni RxJS** — c'est
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

Dernier Mot suit la même frontière. Son `domain/game.ts` réduit trois actions immuables, son
`domain/dictionary.ts` définit le port de recherche de préfixes et `normalize-word.ts` unifie casse,
accents et ligatures. Les règles et leurs raisons vivent dans
`docs/reference/domain-dernier-mot.md`.

## La façade signals — `store/`

`projects/games/cryptogramme/src/lib/store/` (`GameStore`) est une façade signals au-dessus du
réducteur pur de `domain/game.ts` : elle ne contient aucune règle de jeu, chaque méthode construit
une `Action` et la passe à `reduce()`, puis expose l'état qui en résulte (`state`, `topCard`,
`canDraw`, `playableCells`) sous forme de signals pour les composants Angular. C'est la seule
couche du jeu qui a le droit de dépendre d'Angular au-dessus de `domain/`.

`projects/games/dernier-mot/src/lib/store/` applique la même règle : `DernierMotGameStore` expose
les joueurs courant/actifs, la suite de tour et les gagnants, puis délègue chaque transition au
réducteur avant de persister l'état.

## Dictionnaire de Dernier Mot

`projects/games/dernier-mot/src/lib/dictionary/` adapte les fichiers générés au port pur du domaine.
`DictionaryService.load()` charge l'index de préfixes avant le setup ; `manifest()` récupère la
petite attribution affichée dans les crédits ; `definitions(word)` charge et mémorise uniquement le
chunk `definitions/<initiale>.json` nécessaire. Les lectures `lookup` et `completions` restent
synchrones une fois l'index chargé.

Le pipeline spécifique reste dans `projects/games/dernier-mot/tools/` et ses dérivés sous
`content/dictionaries/dernier-mot/`. Le détail des sources, filtres et commandes est dans le
`README` de la bibliothèque.

## Tests — deux runners, ne pas les confondre

- **Vitest** (`npm test`, config `vitest.domain.config.ts`) exécute tout ce qui est sous
  `projects/games/**/domain/**/*.spec.ts` et `projects/games/**/tools/**/*.spec.ts` dans un
  environnement Node pur — pas d'Angular, pas de DOM, démarre en millisecondes. C'est ici que se
  joue le cycle TDD du moteur, relancé des dizaines de fois par heure pendant le travail sur les
  règles.
- **`ng test`** exécute tout le reste (composants Angular, apps) via `@angular/build:unit-test`,
  qui paie ~15s de boot DOM/compilateur à chaque run. La cible `test` du projet `cryptogramme`
  exclut explicitement `**/domain/**` pour ne pas rejouer les mêmes specs sous le runner lent.

Le build isolé de Dernier Mot doit passer par `npm run build:dernier-mot` : comme pour
Cryptogramme, son `tsconfig.lib.json` résout les bibliothèques partagées depuis `dist/`, et le script
construit donc d'abord `ui`, puis `game-core`, avant `dernier-mot`.

## PWA et service worker

Le cycle de version est décrit dans [Versions et mises à jour](releases.md).
`App` monte `ReleaseDialogs` qui coordonne les modales UI partagées, `PwaUpdateService`
et `ReleaseNotesService`. Le showcase reste indépendant de ces services. Les scripts
transversaux de release vivent sous `scripts/release/`, avec les scripts de travail
existants ; leurs tests sont inclus dans le runner Vitest Node.

Le portail est une PWA via `@angular/service-worker` (`^22.0.8` dans `package.json`), configuré par
`projects/apps/portal/ngsw-config.json`. Deux stratégies de cache selon le groupe de ressources :

- `app` (coquille applicative — `index.html`, CSS, JS, `favicon.ico`, `manifest.webmanifest`) :
  `installMode: prefetch` — téléchargée dès l'installation du service worker.
- `assets` (`/icons/**`) : `installMode: lazy`, `updateMode: prefetch`.
- `quotes` (`content/quotes/*.json`) : `installMode: lazy`, `updateMode: lazy` — le corpus n'est mis
  en cache qu'à la demande, jamais préchargé, et les mises à jour ne sont pas non plus anticipées.
- `dernier-mot-dictionary` (`content/dictionaries/dernier-mot/**`) : `installMode: lazy`,
  `updateMode: lazy` — index, manifeste et chunks de définitions sont mis en cache au fil des
  usages.

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

Le corpus chargé reste en mémoire dans la route. Les limites minimum et maximum portent sur les
lettres jouables (accents inclus, espaces et ponctuation exclus) et s'appliquent au prochain
changement de citation. Une nouvelle partie exclut la citation courante ; des limites invalides
ou sans alternative affichent une erreur sans perdre la partie. Recommencer conserve la citation
avec une nouvelle graine. `LpGameToolbar` regroupe les commandes dans un bandeau sticky, suivi de
la table de correspondance compacte et toujours visible. La première ligne porte le retour au
catalogue, le nom du portail et celui du jeu. Le menu ouvre une modale de paramètres avec deux
champs numériques synchronisés à un curseur à deux poignées, borné par le corpus disponible.
`LpGamePage` ouvre les félicitations dès que toutes les
correspondances sont connues ; fermer la modale déclenche l'action `COMPLETE` du moteur.

La route restaure la partie locale avant le chargement du corpus, puis persiste chaque transition
émise par la page. Le showcase ne persiste rien. Le build isolé du cryptogramme construit `ui`
et `game-core` avant le jeu : la persistance utilise `StorageService` de `game-core`.

`LpDernierMotGameRoute` joue le même rôle pour le second jeu : il charge l'index, reprend une partie
valide ou affiche le setup, puis assemble store, dictionnaire et écrans. La route reste lazy sous
`/dernier-mot` ; le module SCSS du jeu part dans le même chunk.

`QuizPage` charge et valide le corpus géographique avant de créer une partie de dix questions.
La route `/quiz`, le store et les styles du jeu sont lazy. Le groupe service worker
`quiz-geography` précharge le corpus et les SVG pour permettre de nouvelles parties hors ligne
après installation. Le build isolé `npm run build:quiz` construit d’abord `ui` et `game-core`.
Les règles, générateurs, données, licences et limites de couverture sont détaillés dans
[`domain-quiz-geographie.md`](domain-quiz-geographie.md).

## Geoquizz : connaissances locales

La séparation est domain/knowledge-stats (contrats/validation/agrégation purs), history (port, idb, coordination et calendrier), store (adaptation minimale de QuizStore, collecte racine et façade de lecture), ui (composants showcase et page), globe (rendu Three.js). Les tests purs utilisent le runner domaine ; Angular/history utilisent ng test avec fake-indexeddb.

/quiz/statistiques est lazy, plus spécifique que la route jeu vide. Three.js et la carte lourde sont importés seulement à la création du globe ; les métadonnées pays/version restent légères. Les nouveaux showcases sont chargés directement par les routes dev, pour éviter de les importer dans le flux produit. Le groupe SW quiz-geography précharge les trois assets knowledge, et app les chunks JS, donc un deep reload statistiques est disponible après installation complète sans visite préalable.

IdlePreloadingStrategy précharge les routes produit marquées après navigation et disponibilité idle ; attend après interaction, suspend pendant navigation/onglet caché, exclut dev et respecte saveData/2g. Un lancement par opportunité idle, sans bloquer sur la complétion d'un parent dont Angular attend les enfants. Aucun renderer ni fetch de données de page n'est instancié par le preload.

Budgets : delta du flux jeu <=10 Ko gzip, statistics+globe <=250 Ko gzip, assets <=600 Ko gzip (précision 0,08 degré approuvée le 8 octobre 2026), sommets <=50 000. Mesure production avec --stats-json ; npm run measure:knowledge compare la fermeture statique des chunks avec le poids du build develop 106866e consigné dans tools/knowledge-budget-baseline.json (un build complet conservé sous tmp/knowledge-stats/baseline est prioritaire). Les scripts measure-knowledge-calculation.ts et measure-knowledge-runtime.mjs mesurent calcul 100k, lecture réelle, heap après cinq visites et estimation des buffers GPU ; résultats sous tmp/knowledge-stats. Les budgets mobiles restent à valider sur matériel : lecture+calcul <=1s, >=30fps/p95<=33ms, heap +50Mo, GPU estimé <=32Mo.

### Runtime Three.js commun aux deux globes

Le globe de correction et celui des connaissances importent à la demande leurs renderers spécifiques, qui utilisent globe/three-runtime.ts : WebGLRenderer basse consommation avec antialiasing, DPR <=1,5, OrbitControls sans déplacement latéral/inertie/autorotation, RAF à la demande suspendue hors écran ou onglet caché, nettoyage idempotent du renderer/contexte et déconnexion des observateurs. Alpha, limites de zoom et activation de la molette restent des options de présentation. globe/globe-labels.ts partage aussi la projection et le placement sans chevauchement des noms, avec styles communs dans _globe-labels.scss. Le globe statistiques active la molette dès l'ouverture sur desktop ; les détails sont affichés dans LpDialog et le sélecteur natif remplace la liste complète comme accès clavier/repli. Les géométries/textures et alternatives accessibles restent propres à chaque vue.

Three.js 0.186.1 est une dépendance racine unique et peerDependency du paquet quiz ; @types/three 0.186.0 est unique. OrbitControls est importé via three/addons/controls/OrbitControls.js par le socle commun. Le build doit contenir un seul chunk moteur partagé par les deux renderers ; measure:knowledge vérifie ce partage et l'absence de Three.js du bundle initial/flux jeu statique.
