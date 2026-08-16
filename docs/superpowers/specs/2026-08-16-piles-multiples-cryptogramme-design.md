# Cryptogramme — Design : main à piles multiples

*Date : 2026-08-16*

## 1. Objectif

Remplacer le modèle de main actuel (une seule pile LIFO plafonnée à `handCapacity`, dont seul le
sommet est jouable) par un modèle à **plusieurs piles simultanément jouables**. Objectif déclaré :
passer de « 1 seule carte jouable à la fois » à 5, en gardant une notion de pile (empilement,
carte du dessus jouable, cartes du dessous cachées) plutôt qu'une main homogène sans ordre.

Issue de suivi : [asirko/lets-ple#11](https://github.com/asirko/lets-ple/issues/11), milestone
`affinage cryptogramme`. Mentionné dans l'issue #8 comme futur levier de difficulté (le nombre de
piles pourra varier plus tard) — ce chantier-ci ne touche que le passage à 5 piles ; d'autres
ajustements de gameplay suivront dans la même story, hors périmètre de ce document.

## 2. Périmètre

**Dans ce chantier**

- Le moteur (`domain/game.ts`, `domain/deck.ts` si nécessaire) : modèle à 5 piles, pioche
  distribuant plusieurs cartes en un seul `DRAW`, sélection de pile, pose sur case.
- Le store (`store/game.store.ts`) : signals et méthodes adaptés au nouveau modèle.
- L'UI du jeu (`ui/cryptogram-hand` → `ui/cryptogram-piles`, `ui/cryptogram-grid`,
  `ui/game-page`) : affichage des 5 piles, marqueur de sélection, zone des piles toujours
  visible pendant le scroll.
- Les tests domaine (`game.spec.ts`, `invariants.spec.ts`) réécrits pour le nouveau modèle.

**Hors périmètre**

- Le nombre de piles comme paramètre de difficulté configurable (reste fixé à 5 ici — la
  généralisation viendra avec l'issue #8 si besoin).
- La refonte responsive complète (issue #4) — seule la visibilité fonctionnelle des piles pendant
  le scroll est traitée ici.
- Tout autre ajustement de gameplay évoqué pour l'issue #11 (vies, givens, autres mécaniques de
  bonus/malus) — à cadrer séparément, plus tard, dans la même story GitHub.

## 3. Règles du nouveau modèle

- La main est composée de **5 piles fixes** (`pileCount`, remplace `handCapacity`). Chaque pile
  est une pile LIFO indépendante : seul son sommet est jouable, les cartes en dessous sont
  visibles (profondeur) mais inertes.
- **`DRAW`** pioche en une seule action jusqu'à `pileCount` cartes (une par pile), qu'une pile soit
  vide ou non — une carte piochée recouvre systématiquement le sommet actuel de sa pile. Aucune
  limite ne bloque le `DRAW` tant que la pioche n'est pas vide (pas de mécanisme de « main
  pleine ») : la taille de la citation borne naturellement la profondeur maximale atteignable.
- En fin de partie, si la pioche contient moins de `pileCount` cartes, la distribution remplit les
  piles dans l'ordre `0..N-1` et s'arrête quand la pioche est épuisée — déterministe, simple à
  tester.
- **Sélection** : le joueur clique une pile **non vide** pour la sélectionner (marqueur visuel
  requis) ; recliquer la même pile désélectionne. Aucune pile n'est sélectionnée par défaut.
- **Pose** : une fois une pile sélectionnée, cliquer une case-lettre vide tente immédiatement d'y
  poser le sommet de la pile sélectionnée (pas d'étape de confirmation séparée). Succès → la carte
  quitte la pile, la case se remplit, la pile se désélectionne. Échec → une erreur, la pile se
  désélectionne, la carte reste en place (comportement identique à l'actuel sur ce point).

## 4. Modèle de données (domaine)

```ts
export interface Puzzle {
  // ...
  readonly pileCount: number; // remplace handCapacity ; défaut 5
}

export interface GameState {
  // ...
  readonly piles: readonly (readonly Sym[])[]; // remplace hand ; longueur fixe = pileCount
  readonly selectedPile: number | null; // remplace selectedCell
}

export type Action =
  | { readonly type: 'SELECT_PILE'; readonly index: number }
  | { readonly type: 'DRAW' }
  | { readonly type: 'PLAY'; readonly index: number } // index = case cible
  | { readonly type: 'RESTART'; readonly seed: string };
```

`pileTopCard(state, pileIndex): Sym | null` remplace `topCard(state)`.

## 5. Logique du réducteur

- **`SELECT_PILE { index }`** : no-op si `status !== 'playing'` ou `piles[index].length === 0`.
  Sinon bascule (`selectedPile === index ? null : index`), comme l'actuel `SELECT_CELL`.
- **`DRAW`** : no-op si `deck.length === 0`. Sinon retire `Math.min(pileCount, deck.length)`
  cartes du sommet du deck et les distribue une à une aux piles `0..N-1`, en empilant sur le
  sommet existant de chaque pile ciblée.
- **`PLAY { index }`** : no-op si `selectedPile === null`. Sinon `card = pileTopCard(state,
  selectedPile)` ; même logique qu'aujourd'hui (comparaison à `puzzle.solution[index]`, erreur ou
  pose), avec `piles[selectedPile]` remplaçant `hand` pour le retrait de la carte, et
  `selectedPile: null` systématiquement en sortie (succès ou échec), comme l'actuel
  `selectedCell: null`.
- **`isPlayable(state, cellIndex)`** : généralisé — dépend de `pileTopCard(state,
  state.selectedPile)` au lieu du `topCard` global. Retourne `false` pour toute case si aucune
  pile n'est sélectionnée.
- **`RESTART`** : inchangé dans sa forme, réinitialise `selectedPile` au lieu de `selectedCell`.

**Invariant central** (`|deck| + Σ|piles|` = cases-lettre vides) : identité de comptage, tient
indépendamment de la répartition en piles. La propriété « toute pile non vide a un sommet jouable
quelque part sur le plateau » généralise l'invariant existant (« la carte du dessus a toujours une
case valide ») — elle tient par construction du deck (multiset exact des symboles restant à
placer), mais **doit être re-vérifiée explicitement** par l'agent `engine-invariant-guardian`
après implémentation, comme l'exige `CLAUDE.md` pour tout changement touchant `game.ts`/`deck.ts`.

## 6. Store (`GameStore`)

- `topCard: Signal<Sym | null>` → `selectedPileTopCard: Signal<Sym | null>`, dérivé de
  `state().selectedPile`.
- `canDraw: Signal<boolean>` simplifié : `status === 'playing' && deck.length > 0` (plus de test
  de capacité de main).
- `selectCell(index)` → `selectPile(index)`, dispatch `SELECT_PILE`.
- `play()` → `play(cellIndex: number)`, dispatch `PLAY { index: cellIndex }`.
- `playableCells: Signal<readonly boolean[]>` : signature inchangée, reflète `isPlayable`
  généralisé.

## 7. UI

- **`lp-cryptogram-hand` → `lp-cryptogram-piles`** : affiche les `pileCount` piles côte à côte,
  chacune avec son sommet visible et un indicateur de profondeur pour les cartes cachées en
  dessous. Clic sur une pile non vide émet `pileSelect(index)`. Marqueur visuel net (bordure/fond)
  sur la pile dont l'index égale `selectedPile`.
- **`lp-cryptogram-grid`** : `[selectedCell]`/`selected` retirés (plus de pré-sélection de case
  indépendante). `cellSelect` conservé comme nom d'event mais son handler dans `lp-game-page`
  appelle désormais `store.play($event)` — le clic sur une case déclenche directement la tentative
  de pose. `playableCells` continue de piloter le surlignage des cases valides une fois une pile
  sélectionnée.
- **`lp-game-page`** : `(pileSelect)="store.selectPile($event)"` sur `lp-cryptogram-piles`,
  `(cellSelect)="store.play($event)"` sur la grille. `[handFull]` de `lp-cryptogram-deck`
  supprimé (plus de notion de main pleine).
- **CSS** (`_cryptogramme.scss`) : la zone des piles passe en `position: sticky` pour rester
  visible pendant le scroll sur une citation longue. Changement scopé à cette visibilité
  fonctionnelle, pas une refonte responsive (issue #4 séparée).

## 8. Tests

- `game.spec.ts` : réécrit pour couvrir `SELECT_PILE`/`DRAW`/`PLAY` sur le modèle à piles
  (sélection d'une pile vide refusée, désélection après pose réussie/ratée, distribution du
  `DRAW` en fin de pioche).
- `invariants.spec.ts` : `jouerCarteJuste` adapté pour choisir une pile non vide dont le sommet
  correspond à une case libre ; nouvel invariant explicite « toute pile non vide a un sommet
  jouable quelque part sur le plateau », en plus de l'invariant de comptage généralisé
  (`Σ|piles|` au lieu de `|hand|`).
- Après implémentation du domaine : invocation de l'agent `engine-invariant-guardian` avant de
  considérer le changement terminé.
- `npm run test:ng` pour les specs Angular des composants UI touchés (si des specs existent déjà
  pour `lp-cryptogram-hand`/`lp-cryptogram-grid`).

## 9. Process de développement

Conformément à la demande explicite de l'utilisateur : le développement de ce chantier se fait
dans un **git worktree dédié**, avec l'app servie sur un **port différent** de celui utilisé par
d'éventuelles autres sessions de travail en parallèle (ex. l'issue #3, en cours dans une autre
session Claude), pour permettre des tests via `claude-in-chrome` sans collision.
