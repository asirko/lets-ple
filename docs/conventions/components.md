# Convention composants — UI d'abord, logique en assemblage

Complète la [convention CSS](css.md) : celle-ci dit *où* va le style, celle-ci dit *quel* composant
a le droit d'en porter.

## Règle d'or

Un composant **UI** (`libs/ui/src/lib/*` ou le dossier `ui/` d'un jeu, ex.
`projects/games/cryptogramme/src/lib/ui/cryptogram-cell/`) se conçoit et se construit **d'abord
dans le showcase de composants (`/dev/components`)**, isolé de tout store ou service métier. Il
reçoit ses données par `input()`, émet par `output()`, et c'est lui qui porte la quasi-totalité du
style visuel du produit fini — via les classes globales SMACSS (voir `css.md`), jamais du CSS
inventé localement. Un fichier `*.showcase.ts` par composant (et par état visuel notable : vide,
rempli, sélectionné, désactivé…) avant, ou en même temps que, l'implémentation — jamais après.

Un composant **logique** (un écran, un assembleur — ex. `LpGamePage`) ne fait qu'orchestrer des
composants UI et un store/service : il pose la disposition entre eux, transmet des `input`/
`output`, et déclenche des actions sur le store. Il n'a **quasiment aucun style propre** : un tout
petit peu de disposition locale (`display: flex`/`grid`, `gap`, agencement des enfants directs)
est toléré si elle est trop ponctuelle pour être une primitive `l-*` réutilisable — sinon rien.
Jamais de couleur, typographie, bordure, ombre, radius, ni de classe métier (`crypto-*`, `b-*`…)
inventée à cet étage : ces éléments existent déjà dans un composant UI ou une primitive globale, on
les compose, on ne les redéfinit pas.

Les éléments de style partagés entre plusieurs composants (couleurs, typographie, espacement,
bordures, ombres, tokens…) ne vivent ni dans l'un ni dans l'autre : ils sont isolés dans le style
global de l'application (`projects/libs/ui/src/styles/`, voir `css.md`), consommé aussi bien par
les composants UI que — rarement, seulement pour la disposition — par les composants logiques.

## Pourquoi cet ordre

Concevoir dans le showcase d'abord force le composant UI à être autonome : pas d'accès direct à un
store, pas de logique métier cachée dans son template. Ça garantit que la logique (règles du jeu,
état, orchestration) reste concentrée dans les composants logiques et le domaine
(`domain/`, `store/`), jamais dispersée dans un composant de présentation — et que chaque
composant UI reste testable et visualisable isolément, à tout moment du projet.

## Exemple dans le repo

`LpGamePage` (`projects/games/cryptogramme/src/lib/ui/game-page/lp-game-page.ts`) est le composant
logique de l'écran de jeu : il construit un `GameStore` à partir de ses inputs et assemble
`LpCipherTable`, `LpCryptogramDeck`, `LpCryptogramGrid`, `LpCryptogramHand`, `LpErrorCounter`,
`LpButton`, `LpPanel` — chacun conçu et documenté dans le showcase avant son intégration ici. Son
propre `styleUrls` est une exception documentée : en tant que point d'entrée routé du jeu, il porte
la référence vers le module SCSS partagé du jeu pour que ce module parte dans le bon chunk lazy
(voir le commentaire en tête du fichier et `css.md#Chargement`) — ce n'est pas du style local, et
ça reste le seul cas de ce genre.

## Où ça vit

```
projects/libs/ui/src/lib/<composant>/        composants UI partagés entre jeux (LpButton, LpCard, LpPanel…)
projects/games/<jeu>/src/lib/ui/<composant>/  composants UI propres à un jeu (cellules, plateau, main…)
projects/games/<jeu>/src/lib/ui/<écran>/      composants logiques du jeu (assembleurs, écrans routés)
```

Chaque composant UI — partagé ou propre à un jeu — a son fichier `*.showcase.ts` à côté de son
implémentation.
