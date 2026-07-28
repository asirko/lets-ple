# Architecture CSS — SMACSS

## Contexte

La tâche 13 (design system et atelier Storybook) a introduit `LpButton`, `LpCard` et `LpPanel`
avec tout leur style — couleurs, fond, bordures, ombres, transitions — dans le `.scss` propre à
chaque composant, sur des variables CSS déjà globales (`projects/libs/ui/src/lib/tokens/tokens.scss`).
Ce document remplace cette approche par une organisation SMACSS : l'immense majorité du style vit
dans des feuilles globales par catégorie, et un composant Angular ne porte plus que la disposition
entre ses propres éléments enfants.

**Objectif.** Un style prévisible et facile à faire évoluer sans toucher au code TypeScript des
composants, avec une frontière nette entre « design system partagé » et « habillage propre à un
jeu ».

## Catégories SMACSS et emplacement

```
projects/libs/ui/src/styles/
  _base.scss         // reset des éléments nus : body, headings, a, button — pas de classes
  _layout.scss        // primitives réutilisables partout : l-stack, l-cluster, l-grid…
  _state.scss          // is-actif, is-désactivé, is-sélectionné, is-masqué…
  tokens.scss           // couche Theme (déjà écrite, tâche 13) : variables CSS clair/sombre
  module/
    _button.scss       // .b-button, .b-primary, .b-secondary, .b-danger
    _card.scss          // .card, .card-title, .card-body, .card-interactive
    _panel.scss          // .panel, .panel-elevated, .panel-padding-sm/md/lg
  index.scss              // @use base, layout, module/*, state, tokens dans cet ordre

projects/games/cryptogramme/src/styles/
  _cryptogramme.scss    // .crypto-board, .crypto-cell, .crypto-hand, .crypto-deck…
```

- **Base** : styles par défaut des éléments HTML nus, aucune classe. Remplace le reset actuellement
  glissé à la main dans `projects/apps/portal/src/styles.scss` (`body { margin: 0; … }`).
- **Layout** : primitives de disposition génériques, réutilisées par plusieurs modules ou pages
  (`l-` préfixe). N'existe que si un besoin réel apparaît — pas de primitives spéculatives.
- **Module** : le style visuel de chaque composant du design system partagé. Un fichier par
  composant sous `module/`, préfixe court et stable par module (`b-` pour bouton ; `card-` et
  `panel-` en toutes lettres pour éviter les collisions avec d'autres futurs modules à initiale
  proche).
- **State** : classes d'état transverses, préfixe `is-`, applicables à n'importe quel module
  (`is-disabled`, `is-selected`…). Un module peut définir ses propres variantes d'état s'il a besoin
  d'un rendu spécifique (`.b-button.is-disabled`), mais le nom de la classe d'état reste générique.
- **Theme** : les tokens CSS déjà en place (`tokens.scss`), clair/sombre. Aucun changement de fond,
  seulement sa place dans `index.scss`.
- **Chaque jeu a son propre module dédié**, hors de `libs/ui` : `projects/games/<jeu>/src/styles/_<jeu>.scss`,
  préfixé par le nom du jeu (`crypto-` pour cryptogramme). Ce fichier n'est jamais importé par le
  design system partagé ni par le portail — voir « Chargement ».

## Nommage

Pas de BEM. Chaque classe appartient à une seule catégorie, reconnaissable à son préfixe :

| Catégorie | Préfixe | Exemple |
|---|---|---|
| Layout | `l-` | `.l-stack`, `.l-cluster` |
| State | `is-` | `.is-disabled`, `.is-selected` |
| Module partagé | court, par module | `.b-button`, `.b-primary`, `.card-title`, `.panel-elevated` |
| Module de jeu | nom du jeu | `.crypto-cell`, `.crypto-hand` |

Un module utilise une classe de base (structure commune) plus une classe courte par variante,
jamais de doublement `--`/`__` :

```html
<button class="b-button b-primary">Valider</button>
<button class="b-button b-danger is-disabled" disabled>Supprimer</button>
```

```scss
// module/_button.scss
.b-button { padding: var(--lp-space-2) var(--lp-space-4); border-radius: var(--lp-radius-md); }
.b-primary { background: var(--lp-color-primary); color: var(--lp-color-primary-contrast); }
.b-danger  { background: var(--lp-color-danger);  color: var(--lp-color-primary-contrast); }
.is-disabled { opacity: .5; cursor: not-allowed; }
```

## Chargement

- **Portail** (`projects/apps/portal/src/styles.scss`) : `@use` le `index.scss` de `libs/ui`. C'est
  tout le style global de l'app, chargé une fois, au démarrage.
- **Storybook** (`projects/apps/storybook/.storybook/preview.ts`) : importe le même `index.scss`,
  plus — en dev seulement — le module de chaque jeu dont des stories existent, pour que ces stories
  s'affichent correctement même si rien d'autre ne charge ce module.
- **Un jeu** : son module SCSS n'est jamais importé par le portail. Il part dans le même chunk lazy
  que le code du jeu, importé par le point d'entrée routé de ce jeu (le composant/route de la
  tâche 15, pas encore écrit). **Point en suspens** : tant que ce point d'entrée n'existe pas, seul
  Storybook charge `_cryptogramme.scss` ; le mécanisme définitif de chargement lazy sera posé à la
  tâche 15 et n'est pas figé par ce document.

## Frontière composant / global

Un composant Angular ne garde en style local que la disposition entre ses **propres** éléments
enfants : `display: flex`/`grid`, `gap`, alignement, position relative/absolue interne au template.
Jamais de couleur, typographie, bordure, ombre ou rayon — toujours une classe globale pour ça, y
compris quand la valeur vient d'un token (`var(--lp-space-*)` ne doit pas apparaître dans un
`styleUrl` de composant).

Si une disposition locale se répète dans plusieurs composants, elle est promue en primitive `l-*`
globale plutôt que dupliquée. Beaucoup de composants n'auront au final aucun style local : c'est le
cas attendu, pas une anomalie.

## Rétrofit de la tâche 13

`LpButton`, `LpCard`, `LpPanel` migrent vers ce schéma avant que la tâche 14 ne commence :

- `LpButton` → `module/_button.scss`. Le composant applique `class="b-button b-primary"` (ou
  `b-secondary`/`b-danger`) et `is-disabled` selon `disabled()`, via `[class]` binding. Plus de
  `lp-button.scss`.
- `LpCard` → `module/_card.scss`. `class="card"` (+ `card-interactive`), `card-title`/`card-body`
  sur les enfants. Plus de `lp-card.scss`.
- `LpPanel` → `module/_panel.scss`. `class="panel"` (+ `panel-elevated`, `panel-padding-sm/md/lg`).
  Plus de `lp-panel.scss`.

Les stories existantes ne changent pas de comportement observable : même rendu visuel, mêmes
variantes. La vérification d'accessibilité (axe-core headless, déjà en place depuis la tâche 13)
est relancée après le rétrofit pour confirmer zéro régression.

## Hors périmètre

- Le mécanisme exact de lazy-loading du CSS d'un jeu avec son chunk de route (posé à la tâche 15).
- Les primitives `_layout.scss` : créées seulement quand un besoin concret apparaît, pas par
  anticipation.
- Un linter ou test automatisé imposant la convention de nommage : envisageable plus tard si des
  écarts apparaissent, pas nécessaire pour démarrer.
