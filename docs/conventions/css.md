# Convention CSS — SMACSS

Rationale et contexte : `docs/superpowers/specs/2026-07-28-architecture-css-smacss-design.md`. Ce
document est la référence rapide à suivre à chaque fois qu'on touche du style ; il ne réexplique
pas le pourquoi.

## Règle d'or

L'immense majorité du style est globale. Un composant Angular ne porte en `styleUrl` que la
disposition entre ses **propres** éléments enfants (`display: flex`/`grid`, `gap`, alignement,
position relative/absolue interne). Jamais de couleur, typographie, bordure, ombre ou rayon dans un
composant — toujours une classe globale, même quand la valeur vient d'un token
(`var(--lp-space-*)` n'apparaît jamais dans un `styleUrl`). Beaucoup de composants n'auront aucun
style local : c'est le cas attendu.

Si une disposition locale se répète dans plusieurs composants, elle est promue en primitive `l-*`
globale plutôt que dupliquée.

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
