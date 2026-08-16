# Showcase de composants — remplacement de Storybook

## Contexte

Storybook (`@storybook/angular-vite` 10.5.5) est bloqué par un bug amont non résolu : le renderer
Angular applique les args d'une story via `Object.assign(this, storyProps)` dans une souscription
RxJS asynchrone, après le premier cycle de détection de changements. Tout composant utilisant un
signal input requis (`input.required<T>()`) plante au montage avec `NG0950` — ce qui couvre la
quasi-totalité des composants du jeu (`LpCryptogramCell.cell`, `LpCipherTable.known`, et
vraisemblablement `LpCryptogramGrid`/`LpCryptogramHand`/`LpErrorCounter`). Seuls les composants du
design system sans input requis (`LpButton`, `LpCard`, `LpPanel`) s'affichent correctement.

Confirmé non lié au mode zoneless du projet (`provideZonelessChangeDetection()` dans le portail) :
forcer `zoneless: false` sur les cibles `angular.json` du builder Storybook et charger `zone.js`
ne change rien à l'erreur — la course a lieu indépendamment de zone/zoneless, dans l'ordre de
montage du renderer lui-même. Deux issues GitHub ouvertes depuis mi-2025 chez `storybookjs/storybook`
documentent le même symptôme sans correctif officiel à ce jour.

Plutôt que de patcher le code interne (minifié) de `@storybook/angular-vite` — fragile, à
revalider à chaque mise à jour — la décision est de remplacer Storybook par un outil maison.

**Audit de ce qui est réellement utilisé aujourd'hui** (voir conversation de brainstorming) :

- 10 fichiers `.stories.ts`, 32 variantes exportées, toutes taguées `autodocs`, **aucune** avec
  `play()` (pas de test d'interaction).
- Aucun fichier de test (`ng test`/vitest) n'importe une story (`composeStories`) — les stories
  sont isolées du reste de la suite de tests, donc rien à migrer côté tests.
- `@chromatic-com/storybook` est installé mais **jamais configuré** (pas de token, pas d'étape
  CI) — résidu du scaffold initial, pas un outil en usage.
- `addon-a11y` (panneau axe-core par story) est présent mais n'est câblé dans aucune vérification
  CI — perte réelle en confort de revue manuelle, aucune régression sur l'automatisé.
- Compodoc (`documentation.json`, gitignored, régénéré à chaque lancement) ne sert qu'à peupler
  les pages `autodocs` de Storybook — il n'est publié ni consommé ailleurs, alors qu'il sait
  générer *seul* un site de doc statique et navigable (classes, composants, JSDoc, coverage) sans
  Storybook.
- `npm run build-storybook` tourne dans `ci.yml` comme simple test de compilation ; le résultat
  n'est ni publié ni déployé.

## Décision

Deux outils à responsabilité séparée, plutôt qu'un outil unique fusionné :

| Outil | Rôle | Changement |
|---|---|---|
| **Compodoc** | Référence API (JSDoc, tables de props, coverage) | Débranché de Storybook, republié seul via son mode natif (`compodoc -p tsconfig.doc.json -s`) — aucun code à écrire, c'est son usage natif |
| **Showcase maison** | Aperçu visuel/interactif des composants **et** revue du design system SMACSS (tokens, classes globales) | Nouveau, route `/dev/components` dans le portail |

Alternative écartée : fusionner les deux (le showcase lirait `documentation.json` pour afficher
les tables de props à côté de l'aperçu visuel) — rejetée par l'utilisateur pour éviter de
réimplémenter ce que Compodoc fait déjà gratuitement en mode autonome.

## Architecture cible

Route `/dev/components` dans `projects/apps/portal` — **volontairement pas exclue du build de
production** : l'utilisateur veut pouvoir la consulter même en prod (aucune donnée sensible n'y
transite, contrairement au corpus de citations couvert par l'avertissement en tête de
`CLAUDE.md`, sans rapport avec ce showcase).

```
/dev/components
├─ /style          guide de style SMACSS — tokens, base, modules, états
└─ /<composant>     un composant du design system ou d'un jeu, avec contrôles dynamiques
```

### Guide de style (`/dev/components/style`)

Gabarit HTML statique consommant directement les classes et variables CSS globales
(`libs/ui/src/styles/`) — pas de composant Angular à écrire :

- Tokens : nuanciers couleur (pastille + valeur hex + ratio de contraste WCAG calculé contre le
  fond et la surface qu'ils accompagnent), échelle typographique, espacements, rayons, ombres.
- Base : rendu des éléments nus stylés par `_base.scss` (titres, liens, boutons).
- Modules : chaque variante de `.b-button`/`.card`/`.panel` et, au fur et à mesure de leur
  migration, des modules de jeu (`.crypto-*`).
- États : `.is-disabled`, `.is-selected`, etc. appliqués à des exemples de chaque module.

C'est cette page qui sert directement la revue de contraste de l'issue #3 et le travail de
raffinement de palette/typographie en cours.

### Composants (`/dev/components/<nom>`)

Un composant `ShowcaseRenderer` générique monte n'importe quel composant dynamiquement
(`ViewContainerRef.createComponent()`) et lui applique ses inputs via `componentRef.setInput()`
**avant** le premier `changeDetectorRef.detectChanges()` — c'est précisément l'inversion de cet
ordre qui casse Storybook ; un test dédié (voir Vérification) verrouille cet invariant pour
qu'une régression future ne le reproduise pas silencieusement.

Chaque composant fournit, à côté de son fichier (remplaçant son `.stories.ts`), une spec de
contrôles :

```ts
export const LP_BUTTON_SHOWCASE: ComponentShowcase<LpButton> = {
  component: LpButton,
  controls: {
    variant: { kind: 'enum', options: ['primary', 'secondary', 'danger'], default: 'primary' },
    disabled: { kind: 'boolean', default: false },
  },
};
```

Types de contrôle couvrant les besoins observés dans les 10 fichiers actuels :

- `enum` — dropdown ou radio (détail de présentation), pour les unions de littéraux (`variant`,
  `type`, `padding`).
- `boolean` — toggle.
- `text` — champ libre (`LpCard.title`).
- `number` — champ numérique (`LpErrorCounter.errors`/`maxErrors`, `LpCryptogramDeck.remaining`).
- `preset` — dropdown listant des valeurs nommées complètes, pour les inputs non triviaux à
  piloter champ par champ (`cell: Cell`, `known: ReadonlyMap<number, Sym>`, `hand: string[]`). La
  plupart des presets sont les mêmes constantes que `VIDE`/`REMPLIE`/`FIXED`/etc. déjà écrites dans
  les `.stories.ts` actuels, déplacées telles quelles. Pour `LpCryptogramGrid`, les fixtures
  actuelles ne sont pas des littéraux mais le résultat de vrais appels au moteur
  (`createGame`/`reduce`/`isPlayable` dans `lp-cryptogram-grid.stories.ts`) — un preset est donc
  une fabrique (`() => value`), évaluée à la sélection, pas seulement une valeur statique.

Le `ShowcaseRenderer` construit un formulaire de contrôles à partir de la spec (signals liés à
chaque contrôle), et réapplique `setInput()` sur le composant monté à chaque changement.

## Migration incrémentale

Storybook et le showcase coexistent pendant toute la transition — pas de bascule d'un coup.

1. **Socle** : `ShowcaseRenderer`, les types `ComponentShowcase`/`ControlSpec`, la route
   `/dev/components`, la page `/style`.
2. **Par composant ou domaine**, dans un ordre à définir dans le plan d'implémentation (probable :
   design system d'abord — `LpButton`/`LpCard`/`LpPanel`, déjà fonctionnels et rapides à valider —
   puis les composants du jeu un par un) : écrire la spec de contrôles + presets, vérifier le rendu
   dans le showcase, supprimer le `.stories.ts` correspondant.
3. **Checklist de parité** avant retrait de Storybook — chacun des 10 fichiers actuels et le guide
   de style doivent avoir un équivalent fonctionnel dans le showcase.
4. **Retrait de Storybook** une fois la checklist cochée : dépendances (`storybook`,
   `@storybook/*`, `@chromatic-com/storybook`, `@analogjs/vite-plugin-angular` si non utilisé
   ailleurs), `.storybook/`, cibles `storybook`/`build-storybook` dans `angular.json`, étape
   `build-storybook` dans `ci.yml`, mentions de Storybook dans `CLAUDE.md` et
   `docs/conventions/components.md` (à réécrire pour pointer vers le showcase).

## Ce qui n'est pas repris

- **`addon-a11y`** (vérifications axe-core par story) — pas d'équivalent immédiat dans le
  showcase. Non câblé en CI aujourd'hui, donc pas de régression automatisée ; perte de confort en
  revue manuelle uniquement. Noté comme piste de suivi, hors scope de cette migration.
- **`addon-vitest`/tests d'interaction** — rien à migrer, aucune story n'en avait.
- **Chromatic** — rien à migrer, jamais configuré.

## Vérification / critères de succès

- Le guide de style (`/dev/components/style`) couvre tous les tokens et toutes les classes
  actuellement définies dans `libs/ui/src/styles/` (module par module).
- Les 10 fichiers `.stories.ts` actuels ont chacun un équivalent fonctionnel dans le showcase
  (mêmes états/variantes, pilotables via les contrôles) avant suppression.
- Un test (unitaire ou d'intégration) sur `ShowcaseRenderer` monte un composant avec un
  `input.required()` et vérifie qu'il ne lève pas `NG0950` — garde-fou contre une régression vers
  le bug qui a motivé cette migration.
- `npm run build` (portail) inclut la route `/dev/components` sans erreur.
- Après retrait de Storybook : `npm ci && npm run build` ne référence plus aucun paquet
  `storybook`/`@storybook/*`/`@chromatic-com/storybook`, et `ci.yml` ne contient plus d'étape
  `build-storybook`.
