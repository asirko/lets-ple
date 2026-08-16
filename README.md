# Let's Plé

Un portail de jeux de langue française, installable en PWA et déployé en statique sur GitHub
Pages. Le nom joue la graphie phonétique de *let's play* — un clin d'œil à l'orthographe, qui est
précisément le sujet des jeux.

Le premier jeu est un **cryptogramme** : une citation dont chaque lettre est remplacée par un
nombre. Le joueur pioche des cartes-lettres dans une main limitée à cinq, en pose une sur la case
de son choix, et dispose de trois erreurs avant de perdre.

## Principe de conception

Toutes les règles du jeu vivent dans un **moteur pur, sans dépendance Angular**
(`projects/games/cryptogramme/src/lib/domain/`). C'est ce qui permet de le tester en millisecondes,
de simuler des parties pour l'équilibrage, et de garantir par construction qu'aucune position n'est
insoluble. L'interface n'est qu'une façade au-dessus de ce moteur.

Le détail des règles, du modèle d'état et des décisions de conception se trouve dans
[`docs/superpowers/specs/2026-07-28-lets-ple-cryptogramme-design.md`](docs/superpowers/specs/2026-07-28-lets-ple-cryptogramme-design.md).

## Structure du dépôt

```
lets-ple/
├─ projects/
│  ├─ apps/
│  │  └─ portal/         app Angular : shell, accueil, catalogue, PWA, /dev/components — le seul build déployé
│  ├─ libs/
│  │  ├─ ui/             design system : tokens, boutons, cartes, panneaux
│  │  └─ game-core/      socle commun aux jeux : registre, i18n, stockage, progression
│  └─ games/
│     └─ cryptogramme/
│        ├─ src/lib/
│        │  ├─ domain/   moteur pur du jeu — aucun import Angular
│        │  ├─ store/    façade signals au-dessus du réducteur
│        │  └─ ui/       composants et showcases
│        └─ tools/       validation du corpus, calcul de difficulté, extraction/filtrage QuoteKG
├─ content/quotes/            corpus de citations, par thème, édité à la main
└─ content/quote-candidates/  citations candidates filtrées, pas encore curées (theme/notoriety/publicDomain)
```

## Stack

Node 24 LTS, Angular 22 (composants standalone, signals, zoneless, builder `@angular/build`),
Vitest pour le moteur et les outils, un showcase de composants maison (`/dev/components`, dans le
portail) pour l'atelier de composants.

## Démarrage

```bash
npm install
npm start                # ng serve portal — http://localhost:4200
```

Le workspace contient plusieurs projets (`portal`, `ui`, `game-core`, `cryptogramme`) ; `npm start`
cible `portal` par défaut.

## Tests

```bash
npm test                 # moteur du jeu et outils (Vitest, sans Angular ni DOM)
npm run test:ng          # composants et applications Angular (ng test)
npm run test:all         # les deux
```

## Corpus de citations

```bash
npm run validate:quotes  # valide content/quotes/*.json contre le schéma
npm run score:quotes     # calcule et écrit le score de difficulté de chaque citation
npm run extract:quotes   # tire des citations candidates depuis QuoteKG (brut, gitignored)
npm run filter:quotes    # filtre par score de qualité -> content/quote-candidates/quotekg.json (versionné)
```

## Build

```bash
npm run build             # build de production de portal, dans dist/
npm run docs              # publie la doc Compodoc en site statique autonome (./documentation, gitignored)
```

## Statut

Le moteur du cryptogramme (chiffrement, plateau, pioche, réducteur, invariants de solvabilité) est
implémenté et testé. Le corpus de citations témoins, sa validation et son score de difficulté sont
en place. L'interface, le portail et le déploiement restent à construire — voir
[`docs/superpowers/plans/2026-07-28-lets-ple-v1.md`](docs/superpowers/plans/2026-07-28-lets-ple-v1.md)
pour le détail des étapes.
