# Convention CSS — SMACSS

Ce document est la référence à suivre à chaque fois qu'on touche du style.

## Pourquoi SMACSS

Avant cette convention, chaque composant (`LpButton`, `LpCard`, `LpPanel`) portait tout son style —
couleurs, fond, bordures, ombres, transitions — dans son propre `.scss`, sur des variables CSS déjà
globales. SMACSS déplace l'immense majorité du style dans des feuilles globales par catégorie, pour
un style prévisible et facile à faire évoluer sans toucher au code TypeScript des composants, avec
une frontière nette entre design system partagé et habillage propre à un jeu. Pas de linter ou de
test automatisé imposant la convention de nommage pour l'instant — envisageable plus tard si des
écarts apparaissent, pas nécessaire pour démarrer.

## Règle d'or

Le mobile est prioritaire : les nouvelles règles partent du petit écran et sont
enrichies par des media queries `min-width` lorsque nécessaire. Les styles existants
évoluent progressivement, sans refonte globale imposée à chaque changement.

Les codes communs (espacements, typographie, états, interactions) sont partagés ;
chaque jeu peut définir ses illustrations et ses surfaces dans son module, mais
toute couleur passe par les tokens.

L'immense majorité du style est globale. Un composant Angular ne porte en `styleUrl` que la
disposition entre ses **propres** éléments enfants (`display: flex`/`grid`, `gap`, alignement,
position relative/absolue interne). Jamais de couleur, typographie, bordure, ombre ou rayon dans un
composant — toujours une classe globale, même quand la valeur vient d'un token
(`var(--lp-space-*)` n'apparaît jamais dans un `styleUrl`). Beaucoup de composants n'auront aucun
style local : c'est le cas attendu (une disposition qui se répète devient une primitive `l-*`, voir
« Couche Layout »).

## Identité Focus et garde-fou

Focus est le thème **racine** (`tokens.scss`), en clair et en sombre : il suit
`prefers-color-scheme` et peut être forcé par `data-theme`. La classe `.theme-focus` n'existe plus ;
aucun jeu ne redéfinit une palette. La cible tactile minimale est le token `--lp-touch-target`.

Le primaire (`--lp-color-primary`) est un fond de bouton, calibré pour porter
`--lp-color-primary-contrast` ; il n'est pas assez contrasté pour du texte sur le fond sombre. Un
texte coloré — lien, score, glyphe d'accent — lit `--lp-color-link`, lisible (AA) sur fond et
surfaces dans les deux modes.

Aucune couleur ni longueur en dur dans les feuilles gardées : couleurs via `var(--lp-color-*)` (ou
`--lp-globe-*`, `--lp-knowledge-*`), longueurs via `var(--lp-space-*)`, `--lp-radius-*`, etc. Sont
tolérés `0`, `1px` et `2px`, ainsi que les valeurs dans une déclaration de propriété personnalisée
et dans une condition `@media`. Une dimension intrinsèque propre à un jeu (silhouette, option…)
est une propriété personnalisée `--<jeu>-*` déclarée dans son module, puis consommée par `var()`.

`scripts/design-guard.ts` et `scripts/design-repo.spec.ts` (Vitest, `npm test`) vérifient : pas de
couleur littérale, pas de longueur littérale hors exceptions, pas de propriété personnalisée qui se
référence elle-même, parité des blocs clair/sombre, contrastes AA des paires de tokens (dont lien,
accent, danger et succès sur fond et surface), contrastes des couleurs de globe (dont le surlignage
du pays cherché), pas de `b-button` nu dans le quiz et couleurs du splash de démarrage incluses
dans les tokens.

## Couche Layout

`_layout.scss` fournit des primitives `l-*` : `l-stack`, `l-cluster` et `l-grid`. Elles se règlent
par `--l-gap` (défaut `--lp-space-4`) et, pour `l-grid`, `--l-grid-min` (largeur minimale d'une
colonne, défaut 16rem). Une disposition répétée dans plusieurs composants devient une primitive
`l-*` plutôt qu'un `styleUrl` dupliqué.

## Couleurs lues par le JavaScript

Le rendu du globe (`globe/three-globe.ts`, Three.js, partagé par la correction et les statistiques)
ne contient aucune couleur : `globe/css-color.ts` lit les tokens `--lp-globe-*` et
`--lp-knowledge-*` sur l'élément racine, et `observeTheme` relance le rendu quand le thème change
(désabonné au `dispose`). Les hachures du niveau « insuffisant » lisent `--lp-knowledge-stripe`,
comme la pastille de la légende. La vue SVG de repli (`_globe.scss`) lit les mêmes tokens.

Dans la correction, les pays autour sont peints en `--lp-globe-land` (teinte `land`) et le pays
cherché en `--lp-globe-highlight` (teinte `highlight`), contrasté à au moins 3:1 avec
`--lp-globe-land` ; son contour lit `--lp-globe-highlight-contrast` (blanc en clair, quasi noir en
sombre, où le surlignage est clair). Le contour d'un pays sélectionné hors surlignage — le globe des
connaissances — lit `--lp-globe-marker`.

## Emplacement

```
projects/libs/ui/src/styles/
  _base.scss        // reset des éléments nus (body, headings, a, button) — pas de classes
  _layout.scss       // primitives réutilisées partout : l-stack, l-cluster, l-grid… (créées au besoin)
  _state.scss          // is-actif, is-désactivé, is-sélectionné, is-masqué…
  tokens.scss           // couche Theme : variables CSS clair/sombre
  module/
    _button.scss       // .b-button, .b-primary, .b-secondary, .b-danger
    _card.scss          // .card, .card-title, .card-body, .card-interactive
    _panel.scss          // .panel, .panel-elevated, .panel-padding-sm/md/lg
  index.scss              // @use base, layout, module/*, state, tokens dans cet ordre

projects/games/<jeu>/src/styles/
  _<jeu>.scss            // module dédié à ce jeu, ex. _cryptogramme.scss → .crypto-board, .crypto-cell…
```

Chaque nouveau jeu ajoute son propre `src/styles/_<jeu>.scss` sur ce modèle. Ce fichier n'est
jamais importé par `libs/ui` ni par le portail (voir « Chargement »).

## Nommage — pas de BEM

| Catégorie | Préfixe | Exemple |
|---|---|---|
| Layout | `l-` | `.l-stack`, `.l-cluster` |
| State | `is-` | `.is-disabled`, `.is-selected` |
| Module partagé | court et stable par module | `.b-button`, `.b-primary`, `.card-title`, `.panel-elevated` |
| Module de jeu | nom du jeu | `.crypto-cell`, `.crypto-hand` |

Une classe de base pose la structure commune du module, une classe courte par variante ajoute ce
qui change, une classe `is-*` gère l'état — jamais de `--`/`__` à la BEM :

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

Un module peut cibler un état avec un sélecteur composé (`.b-button.is-disabled`) si son rendu pour
cet état est spécifique, mais le nom de la classe d'état reste générique et partagé.

## Chargement

- **Portail** (`projects/apps/portal/src/styles.scss`) : `@use` le `index.scss` de `libs/ui`.
- **Showcase de composants** (`/dev/components`, dans le portail) : le portail importe déjà
  `index.scss` globalement ; le module SCSS d'un jeu (`_cryptogramme.scss`) n'est chargé que
  lorsque la page showcase d'un composant de ce jeu (ex. `LpGamePage`) est visitée, via le même
  mécanisme de chunk lazy que la route `/cryptogramme` elle-même.
- **Un jeu** : son module SCSS part dans le même chunk lazy que son code, importé par le point
  d'entrée routé du jeu — jamais par le portail.
