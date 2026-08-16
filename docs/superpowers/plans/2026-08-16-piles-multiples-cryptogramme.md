# Piles multiples (cryptogramme) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la main LIFO à carte unique jouable du cryptogramme par un modèle à 5 piles
indépendantes, toutes simultanément jouables par leur sommet.

**Architecture:** Réécriture du réducteur pur (`domain/game.ts`) et de ses tests, propagée à la
façade signals (`store/game.store.ts`) puis à l'UI (nouveau composant `lp-cryptogram-piles`,
réécriture de `lp-game-page.ts`, ajout de styles). Aucun autre fichier du jeu n'a besoin de
changer — voir Global Constraints.

**Tech Stack:** TypeScript pur (domaine), Angular 22 signals (store/UI), Vitest (domaine),
`ng test` (composants Angular, non utilisé ici car aucun composant touché n'a de `.spec.ts`
dédié).

## Global Constraints

- Spec de référence : `docs/superpowers/specs/2026-08-16-piles-multiples-cryptogramme-design.md`
  — lire ce document avant de commencer, il explique le *pourquoi* de chaque choix ci-dessous.
- **Ne pas toucher aux fichiers `*.stories.ts`.** Storybook sera retiré dans un chantier séparé ;
  toute mise à jour de contenu de story est explicitement hors périmètre ici. Pour éviter de
  casser `npm run build-storybook` (étape de CI), chaque tâche ci-dessous est conçue pour
  **ne jamais supprimer ou renommer** une entrée publique (`input`/`output`) d'un composant déjà
  consommé par une story existante — `lp-cryptogram-hand`, `lp-cryptogram-grid` et
  `lp-cryptogram-deck` restent inchangés dans leur code ; seul `lp-game-page.ts` change ce qu'il
  leur passe. Le composant `lp-cryptogram-hand` devient du code mort après ce chantier (plus
  utilisé par `lp-game-page`) — c'est attendu, il sera nettoyé avec le retrait de Storybook.
- Domaine pur : `domain/game.ts` ne doit importer ni `@angular/*` ni `rxjs` (`purity.spec.ts` le
  vérifie déjà, aucun changement n'y est nécessaire).
- Après toute modification de `game.ts`/`deck.ts`/`givens.ts` : invoquer l'agent
  `engine-invariant-guardian` avant de considérer le travail terminé (voir Task 3).
- Séquencement : tant que Task 1 (domaine) n'est pas terminée, `store/game.store.ts` et
  `ui/game-page/lp-game-page.ts` ne compilent plus (ils référencent `hand`/`topCard`/
  `handCapacity`/`SELECT_CELL`, retirés). C'est attendu — `npm run build`/`npm test` (suite
  complète) ne redeviennent verts qu'une fois toutes les tâches terminées ; chaque tâche est
  validée par la commande de test ciblée indiquée dans ses propres steps.
- Développement dans un **git worktree dédié** (mis en place automatiquement par
  `superpowers:using-git-worktrees` au moment de l'exécution) ; l'app y est servie sur un **port
  différent** du port par défaut (4200), pour permettre des vérifications `claude-in-chrome` sans
  collision avec d'autres sessions de travail en parallèle sur ce dépôt — voir Task 8.

---

### Task 1: Domaine — modèle à piles multiples (`game.ts`)

**Files:**
- Modify (réécriture complète) : `projects/games/cryptogramme/src/lib/domain/game.ts`
- Modify (réécriture complète) : `projects/games/cryptogramme/src/lib/domain/game.spec.ts`

**Interfaces:**
- Consumes : `toSymbols`/`distinctSymbols`/`symbolCounts` (`./alphabet`), `createRng`
  (`./rng`), `buildCipher` (`./cipher`), `pickGivens` (`./givens`), `buildBoard` (`./board`),
  `buildDeck` (`./deck`) — aucune de ces signatures ne change.
- Produces : `Puzzle` (avec `pileCount: number` remplaçant `handCapacity`), `GameState` (avec
  `piles: readonly (readonly Sym[])[]` remplaçant `hand`, `selectedPile: number | null`
  remplaçant `selectedCell`), `Action` (`SELECT_PILE`/`DRAW`/`PLAY { index }`/`RESTART`),
  `GameOptions` (`pileCount?: number` remplaçant `handCapacity?`), `createGame`, `reduce`,
  `isPlayable`, et **`pileTopCard(state, pileIndex: number | null): Sym | null`** remplaçant
  `topCard`. Consommé par Task 4 (store) et implicitement par Task 2/Task 3 (tests).

- [ ] **Step 1: Écrire les tests (remplace tout le fichier)**

```typescript
import { describe, it, expect } from 'vitest';
import { createGame, reduce, pileTopCard, isPlayable } from './game';
import type { GameState } from './game';

const CITATION = "L'idee vient en marchant.";
const nouvelleP = () => createGame('q1', CITATION, { seed: 'test-1' });

const enMain = (s: GameState) => s.piles.reduce((total, pile) => total + pile.length, 0);

/** Sélectionne la première pile non vide dont le sommet est correct sur une case, puis pose. */
function poserJuste(state: GameState): GameState {
  for (let pileIndex = 0; pileIndex < state.piles.length; pileIndex++) {
    const carte = pileTopCard(state, pileIndex);
    if (carte === null) continue;
    const index = state.board.findIndex(
      (c, i) => c.kind === 'letter' && c.filled === null && state.puzzle.solution[i] === carte,
    );
    if (index >= 0) {
      return reduce(reduce(state, { type: 'SELECT_PILE', index: pileIndex }), {
        type: 'PLAY',
        index,
      });
    }
  }
  throw new Error('aucune pose juste possible');
}

/** Sélectionne la première pile non vide, puis pose son sommet sur une case où il est faux. */
function poserFaux(state: GameState): GameState {
  for (let pileIndex = 0; pileIndex < state.piles.length; pileIndex++) {
    const carte = pileTopCard(state, pileIndex);
    if (carte === null) continue;
    const index = state.board.findIndex(
      (c, i) => c.kind === 'letter' && c.filled === null && state.puzzle.solution[i] !== carte,
    );
    if (index >= 0) {
      return reduce(reduce(state, { type: 'SELECT_PILE', index: pileIndex }), {
        type: 'PLAY',
        index,
      });
    }
  }
  throw new Error('aucune pose fausse possible');
}

describe('createGame', () => {
  it('démarre en cours, sans erreur et piles vides', () => {
    const s = nouvelleP();
    expect(s.status).toBe('playing');
    expect(s.errors).toBe(0);
    expect(s.piles).toHaveLength(5);
    expect(s.piles.every((p) => p.length === 0)).toBe(true);
  });

  it('offre entre 2 et 3 correspondances', () => {
    expect(nouvelleP().known.size).toBeGreaterThanOrEqual(2);
    expect(nouvelleP().known.size).toBeLessThanOrEqual(3);
  });

  it('applique les valeurs par défaut du spec', () => {
    const s = nouvelleP();
    expect(s.puzzle.pileCount).toBe(5);
    expect(s.puzzle.maxErrors).toBe(3);
    expect(s.puzzle.accentMode).toBe('distinct');
  });

  it('est reproductible pour une même graine', () => {
    expect(createGame('q1', CITATION, { seed: 'x' }).deck).toEqual(
      createGame('q1', CITATION, { seed: 'x' }).deck,
    );
  });

  it('respecte l’invariant dès la création', () => {
    const s = nouvelleP();
    const vides = s.board.filter((c) => c.kind === 'letter' && c.filled === null).length;
    expect(s.deck.length + enMain(s)).toBe(vides);
  });
});

describe('DRAW', () => {
  it('distribue jusqu’à pileCount cartes, une par pile', () => {
    const avant = nouvelleP();
    const s = reduce(avant, { type: 'DRAW' });
    const attendu = Math.min(5, avant.deck.length);
    expect(enMain(s)).toBe(attendu);
    expect(s.deck).toHaveLength(avant.deck.length - attendu);
    for (let i = 0; i < 5; i++) expect(s.piles[i].length).toBe(i < attendu ? 1 : 0);
  });

  it('empile sur les piles déjà occupées plutôt que de bloquer', () => {
    let s = reduce(nouvelleP(), { type: 'DRAW' });
    s = reduce(s, { type: 'DRAW' });
    expect(s.piles.every((pile) => pile.length === 2)).toBe(true);
  });

  it('ne fait rien quand la pioche est vide', () => {
    let s = nouvelleP();
    let garde = 0;
    while (s.deck.length > 0 && garde++ < 1000) s = reduce(s, { type: 'DRAW' });
    const avant = enMain(s);
    const rejoue = reduce(s, { type: 'DRAW' });
    expect(rejoue.deck).toHaveLength(0);
    expect(enMain(rejoue)).toBe(avant);
  });

  it('en fin de pioche, ne remplit que les premières piles, dans l’ordre', () => {
    let s = nouvelleP();
    let garde = 0;
    while (s.deck.length >= 5 && garde++ < 1000) s = reduce(s, { type: 'DRAW' });
    const restant = s.deck.length;
    const avant = s.piles.map((p) => p.length);
    s = reduce(s, { type: 'DRAW' });
    expect(s.deck).toHaveLength(0);
    for (let i = 0; i < 5; i++) {
      expect(s.piles[i].length).toBe(i < restant ? avant[i] + 1 : avant[i]);
    }
  });
});

describe('PLAY', () => {
  it('ne fait rien sans pile sélectionnée', () => {
    const s = reduce(nouvelleP(), { type: 'DRAW' });
    const cible = s.board.findIndex((c) => c.kind === 'letter' && c.filled === null);
    expect(reduce(s, { type: 'PLAY', index: cible })).toEqual(s);
  });

  it('ne fait rien sur une pile vide', () => {
    const s = nouvelleP();
    const cible = s.board.findIndex((c) => c.kind === 'letter' && c.filled === null);
    const apres = reduce(reduce(s, { type: 'SELECT_PILE', index: 0 }), {
      type: 'PLAY',
      index: cible,
    });
    expect(apres).toEqual(s);
  });

  it('remplit la case et révèle la correspondance sur une pose juste', () => {
    const avant = reduce(nouvelleP(), { type: 'DRAW' });
    const apres = poserJuste(avant);
    expect(apres.errors).toBe(0);
    expect(enMain(apres)).toBe(enMain(avant) - 1);
    expect(apres.known.size).toBe(avant.known.size + 1);
    expect(apres.selectedPile).toBeNull();
  });

  it('compte une erreur et garde la carte sur une pose fausse', () => {
    const avant = reduce(nouvelleP(), { type: 'DRAW' });
    const apres = poserFaux(avant);
    expect(apres.errors).toBe(1);
    expect(apres.piles).toEqual(avant.piles);
    expect(apres.selectedPile).toBeNull();
  });

  it('perd la partie à la troisième erreur', () => {
    let s = reduce(nouvelleP(), { type: 'DRAW' });
    for (let i = 0; i < 3; i++) s = poserFaux(s);
    expect(s.errors).toBe(3);
    expect(s.status).toBe('lost');
  });

  it('ignore toute action une fois la partie terminée', () => {
    let s = reduce(nouvelleP(), { type: 'DRAW' });
    for (let i = 0; i < 3; i++) s = poserFaux(s);
    expect(reduce(s, { type: 'DRAW' })).toEqual(s);
  });

  it('gagne la partie quand toutes les cases sont remplies', () => {
    let s = createGame('q', 'ABA', { seed: 'g' });
    let garde = 0;
    while (s.status === 'playing' && garde++ < 50) {
      s = enMain(s) === 0 ? reduce(s, { type: 'DRAW' }) : poserJuste(s);
    }
    expect(s.status).toBe('won');
    expect(s.errors).toBe(0);
  });
});

describe('SELECT_PILE', () => {
  it('désélectionne quand on reclique la même pile', () => {
    const s = reduce(nouvelleP(), { type: 'DRAW' });
    const apres = reduce(s, { type: 'SELECT_PILE', index: 0 });
    expect(reduce(apres, { type: 'SELECT_PILE', index: 0 }).selectedPile).toBeNull();
  });

  it('sélectionne une pile différente sans repasser par null', () => {
    const s = reduce(nouvelleP(), { type: 'DRAW' });
    const apres = reduce(s, { type: 'SELECT_PILE', index: 0 });
    expect(reduce(apres, { type: 'SELECT_PILE', index: 1 }).selectedPile).toBe(1);
  });

  it('refuse une pile vide', () => {
    const s = nouvelleP();
    expect(reduce(s, { type: 'SELECT_PILE', index: 0 }).selectedPile).toBeNull();
  });
});

describe('isPlayable', () => {
  it('exclut une case dont le code résolu contredit le sommet de la pile sélectionnée', () => {
    const s = reduce(reduce(nouvelleP(), { type: 'DRAW' }), { type: 'SELECT_PILE', index: 0 });
    const carte = pileTopCard(s, 0)!;
    const contredite = s.board.findIndex(
      (c) =>
        c.kind === 'letter' &&
        c.filled === null &&
        s.known.has(c.code) &&
        s.known.get(c.code) !== carte,
    );
    if (contredite >= 0) expect(isPlayable(s, contredite)).toBe(false);
  });

  it('accepte une case dont le code est inconnu', () => {
    const s = reduce(reduce(nouvelleP(), { type: 'DRAW' }), { type: 'SELECT_PILE', index: 0 });
    const inconnue = s.board.findIndex(
      (c) => c.kind === 'letter' && c.filled === null && !s.known.has(c.code),
    );
    expect(isPlayable(s, inconnue)).toBe(true);
  });

  it('refuse toute case si aucune pile n’est sélectionnée', () => {
    const s = reduce(nouvelleP(), { type: 'DRAW' });
    const vide = s.board.findIndex((c) => c.kind === 'letter' && c.filled === null);
    expect(isPlayable(s, vide)).toBe(false);
  });
});

describe('RESTART', () => {
  it('rejoue la même citation avec un chiffrement différent', () => {
    const avant = nouvelleP();
    const apres = reduce(avant, { type: 'RESTART', seed: 'autre-graine' });
    expect(apres.puzzle.text).toBe(avant.puzzle.text);
    expect(apres.status).toBe('playing');
    expect(apres.errors).toBe(0);
    expect(apres.piles.every((p) => p.length === 0)).toBe(true);
    expect(apres.deck).not.toEqual(avant.deck);
  });
});
```

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `npx vitest run game.spec.ts`
Expected: échec — soit erreurs de compilation TypeScript (`hand`/`topCard`/`SELECT_CELL`/
`handCapacity` n'existent pas encore avec cette forme), soit assertions en échec. Les deux sont
attendus à ce stade.

- [ ] **Step 3: Réécrire `game.ts`**

```typescript
import type { Sym, AccentMode, Cell } from './types';
import { toSymbols, distinctSymbols, symbolCounts } from './alphabet';
import { createRng } from './rng';
import { buildCipher } from './cipher';
import { pickGivens } from './givens';
import { buildBoard } from './board';
import { buildDeck } from './deck';

/**
 * État et règles du jeu.
 *
 * Le moteur est un réducteur pur : `(état, action) => nouvel état`. Aucune mutation en place,
 * aucun effet de bord, aucune dépendance au framework. C'est ce qui permet de simuler des
 * milliers de parties en quelques millisecondes et de prouver qu'aucune n'est insoluble.
 */

/** Paramètres figés d'une partie. */
export interface Puzzle {
  readonly quoteId: string;
  readonly text: string;
  readonly seed: string;
  readonly accentMode: AccentMode;
  readonly pileCount: number;
  readonly maxErrors: number;
  /** Symbole attendu pour chaque case, aligné sur `board`. `null` = case fixe. */
  readonly solution: readonly (Sym | null)[];
}

export interface GameState {
  readonly puzzle: Puzzle;
  readonly board: readonly Cell[];
  /** Table de correspondance révélée : nombre → symbole. */
  readonly known: ReadonlyMap<number, Sym>;
  readonly deck: readonly Sym[];
  /** `pileCount` piles LIFO indépendantes ; seul le sommet de chacune est jouable. */
  readonly piles: readonly (readonly Sym[])[];
  readonly selectedPile: number | null;
  readonly errors: number;
  readonly status: 'playing' | 'won' | 'lost';
}

export type Action =
  | { readonly type: 'SELECT_PILE'; readonly index: number }
  | { readonly type: 'DRAW' }
  | { readonly type: 'PLAY'; readonly index: number }
  | { readonly type: 'RESTART'; readonly seed: string };

export interface GameOptions {
  readonly seed: string;
  readonly accentMode?: AccentMode;
  readonly pileCount?: number;
  readonly maxErrors?: number;
  readonly givenCount?: number;
}

const DEFAULTS = {
  accentMode: 'distinct' as AccentMode,
  pileCount: 5,
  maxErrors: 3,
  givenCount: 3,
};

export function createGame(quoteId: string, text: string, options: GameOptions): GameState {
  const accentMode = options.accentMode ?? DEFAULTS.accentMode;
  const pileCount = options.pileCount ?? DEFAULTS.pileCount;
  const maxErrors = options.maxErrors ?? DEFAULTS.maxErrors;
  const givenCount = options.givenCount ?? DEFAULTS.givenCount;

  const solution = toSymbols(text, accentMode);
  const symbols = distinctSymbols(solution);
  const counts = symbolCounts(solution);

  // Une sous-graine par usage : sans cela, deux tirages consécutifs se corréleraient.
  const givens = pickGivens(counts, givenCount, createRng(`${options.seed}:givens`));
  const cipher = buildCipher(symbols, createRng(`${options.seed}:cipher`));
  const board = buildBoard(text, accentMode, cipher, givens);
  const deck = buildDeck(solution, givens, createRng(`${options.seed}:deck`));

  const known = new Map<number, Sym>();
  for (const sym of givens) known.set(cipher.get(sym)!, sym);

  return {
    puzzle: { quoteId, text, seed: options.seed, accentMode, pileCount, maxErrors, solution },
    board,
    known,
    deck,
    piles: Array.from({ length: pileCount }, () => []),
    selectedPile: null,
    errors: 0,
    // Calculé plutôt que supposé : un texte sans aucune lettre, ou dont tous les symboles
    // seraient offerts, produirait une grille déjà complète.
    status: emptyLetterCells(board) === 0 ? 'won' : 'playing',
  };
}

/** Carte jouable d'une pile, son sommet. `null` si la pile est vide ou l'index nul. */
export function pileTopCard(state: GameState, pileIndex: number | null): Sym | null {
  if (pileIndex === null) return null;
  const pile = state.piles[pileIndex];
  return pile && pile.length > 0 ? pile[pile.length - 1] : null;
}

/**
 * Une case est jouable si elle est vide, qu'une pile est sélectionnée, et si rien de connu ne
 * contredit le sommet de cette pile.
 *
 * Ce garde-fou est purement informationnel : il empêche le joueur de perdre une erreur sur un
 * clic malheureux, alors qu'il savait déjà que ce nombre valait autre chose. Une erreur ne
 * peut donc naître que d'un vrai pari sur un nombre encore inconnu.
 */
export function isPlayable(state: GameState, index: number): boolean {
  const cell = state.board[index];
  if (!cell || cell.kind !== 'letter' || cell.filled !== null) return false;

  const card = pileTopCard(state, state.selectedPile);
  if (card === null) return false;

  const resolved = state.known.get(cell.code);
  return resolved === undefined || resolved === card;
}

function emptyLetterCells(board: readonly Cell[]): number {
  return board.filter((c) => c.kind === 'letter' && c.filled === null).length;
}

export function reduce(state: GameState, action: Action): GameState {
  if (action.type === 'RESTART') {
    return createGame(state.puzzle.quoteId, state.puzzle.text, {
      seed: action.seed,
      accentMode: state.puzzle.accentMode,
      pileCount: state.puzzle.pileCount,
      maxErrors: state.puzzle.maxErrors,
    });
  }

  if (state.status !== 'playing') return state;

  switch (action.type) {
    case 'SELECT_PILE': {
      const pile = state.piles[action.index];
      if (!pile || pile.length === 0) return state;
      const next = state.selectedPile === action.index ? null : action.index;
      return { ...state, selectedPile: next };
    }

    case 'DRAW': {
      if (state.deck.length === 0) return state;

      const drawCount = Math.min(state.puzzle.pileCount, state.deck.length);
      const deck = state.deck.slice(0, state.deck.length - drawCount);
      // Cartes piochées, dans l'ordre où elles sortent de la pioche (le sommet en premier).
      const drawnInOrder = state.deck.slice(state.deck.length - drawCount).reverse();

      const piles = state.piles.map((pile, i) =>
        i < drawCount ? [...pile, drawnInOrder[i]] : pile,
      );

      return { ...state, deck, piles };
    }

    case 'PLAY': {
      const pileIndex = state.selectedPile;
      const card = pileTopCard(state, pileIndex);
      if (pileIndex === null || card === null) return state;

      const cell = state.board[action.index];
      if (!cell || cell.kind !== 'letter' || cell.filled !== null) return state;

      // Pose fausse : une erreur, la carte reste sur sa pile.
      if (state.puzzle.solution[action.index] !== card) {
        const errors = state.errors + 1;
        return {
          ...state,
          errors,
          selectedPile: null,
          status: errors >= state.puzzle.maxErrors ? 'lost' : 'playing',
        };
      }

      const board = [...state.board];
      board[action.index] = { ...cell, filled: card };

      const known = new Map(state.known);
      known.set(cell.code, card);

      const piles = state.piles.map((pile, i) => (i === pileIndex ? pile.slice(0, -1) : pile));

      return {
        ...state,
        board,
        known,
        piles,
        selectedPile: null,
        status: emptyLetterCells(board) === 0 ? 'won' : 'playing',
      };
    }
  }
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run game.spec.ts`
Expected: PASS, tous les tests verts.

- [ ] **Step 5: Commit**

```bash
git add projects/games/cryptogramme/src/lib/domain/game.ts projects/games/cryptogramme/src/lib/domain/game.spec.ts
git commit -m "feat(cryptogramme): remplace la main lifo par 5 piles jouables"
```

---

### Task 2: Domaine — invariants par simulation (`invariants.spec.ts`)

**Files:**
- Modify (réécriture complète) : `projects/games/cryptogramme/src/lib/domain/invariants.spec.ts`

**Interfaces:**
- Consumes : `createGame`, `reduce`, `pileTopCard` de `./game` (Task 1). Type `GameState`.
- Produces : rien de consommé par une tâche suivante — validation par simulation.

- [ ] **Step 1: Réécrire le fichier**

```typescript
import { describe, it, expect } from 'vitest';
import { createGame, reduce, pileTopCard } from './game';
import type { GameState } from './game';

/**
 * Preuves par simulation.
 *
 * Ces tests ne vérifient pas un comportement ponctuel mais des propriétés qui doivent tenir
 * sur l'ensemble des parties possibles. Un échec ici signale toujours un défaut du moteur,
 * jamais du test.
 */

const CITATIONS = [
  "L'idee vient en marchant.",
  "Rien n'est plus puissant qu'une idée dont l'heure est venue.",
  'Éàê ; ôùç !', // accents et ponctuation dense
  'A.', // cas dégénéré : un seul symbole
  'ABA', // cas dégénéré : deux symboles distincts
];

const GRAINES = Array.from({ length: 50 }, (_, i) => `graine-${i}`);

const casesVides = (s: GameState) =>
  s.board.filter((c) => c.kind === 'letter' && c.filled === null).length;

const enMain = (s: GameState) => s.piles.reduce((total, pile) => total + pile.length, 0);

/** Joue le sommet de la première pile correcte trouvée. Pioche si toutes les piles sont vides. */
function jouerCarteJuste(s: GameState): GameState {
  for (let pileIndex = 0; pileIndex < s.piles.length; pileIndex++) {
    const carte = pileTopCard(s, pileIndex);
    if (carte === null) continue;
    const index = s.board.findIndex(
      (c, i) => c.kind === 'letter' && c.filled === null && s.puzzle.solution[i] === carte,
    );
    if (index < 0) continue;
    return reduce(reduce(s, { type: 'SELECT_PILE', index: pileIndex }), { type: 'PLAY', index });
  }
  return reduce(s, { type: 'DRAW' });
}

describe('invariants du moteur', () => {
  it('|pioche| + |cartes en main| = cases vides, après chaque action', () => {
    for (const text of CITATIONS) {
      for (const seed of GRAINES.slice(0, 10)) {
        let s = createGame('q', text, { seed });
        expect(s.deck.length + enMain(s)).toBe(casesVides(s));

        for (let i = 0; i < 200 && s.status === 'playing'; i++) {
          s =
            enMain(s) === 0 || (s.deck.length > 0 && i % 3 === 0)
              ? reduce(s, { type: 'DRAW' })
              : jouerCarteJuste(s);
          expect(s.deck.length + enMain(s)).toBe(casesVides(s));
        }
      }
    }
  });

  it('une partie jouée parfaitement se gagne toujours, sans erreur', () => {
    for (const text of CITATIONS) {
      for (const seed of GRAINES) {
        let s = createGame('q', text, { seed });
        let garde = 0;

        while (s.status === 'playing' && garde++ < 500) {
          s = enMain(s) === 0 ? reduce(s, { type: 'DRAW' }) : jouerCarteJuste(s);
        }

        expect(s.status, `citation "${text}" / graine ${seed}`).toBe('won');
        expect(s.errors).toBe(0);
        expect(s.deck).toHaveLength(0);
        expect(enMain(s)).toBe(0);
      }
    }
  });

  it('toute pile non vide a un sommet jouable quelque part sur le plateau', () => {
    for (const seed of GRAINES) {
      let s = reduce(createGame('q', CITATIONS[1], { seed }), { type: 'DRAW' });

      while (s.status === 'playing') {
        for (let pileIndex = 0; pileIndex < s.piles.length; pileIndex++) {
          const carte = pileTopCard(s, pileIndex);
          if (carte === null) continue;
          const cible = s.board.findIndex(
            (c, i) => c.kind === 'letter' && c.filled === null && s.puzzle.solution[i] === carte,
          );
          expect(cible, `graine ${seed}, pile ${pileIndex}`).toBeGreaterThanOrEqual(0);
        }

        s = jouerCarteJuste(s);
      }
    }
  });
});
```

Note : l'ancien test « la main ne dépasse jamais sa capacité » disparaît — le mécanisme qu'il
vérifiait (plafond total de main forçant à jouer avant de repiocher) n'existe plus dans le
nouveau modèle (confirmé dans la spec : « aucune limite »). Rien ne le remplace, il n'y a plus
rien à garantir à cet endroit.

- [ ] **Step 2: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run invariants.spec.ts`
Expected: PASS, les 3 tests verts (peut prendre quelques secondes, simulation sur 50 graines ×
5 citations).

- [ ] **Step 3: Commit**

```bash
git add projects/games/cryptogramme/src/lib/domain/invariants.spec.ts
git commit -m "test(cryptogramme): adapte les invariants par simulation au modele a piles"
```

---

### Task 3: Vérification de l'invariant du moteur (agent dédié)

**Files:** aucun — tâche de vérification uniquement.

**Interfaces:**
- Consumes : l'état du dépôt après Task 1 et Task 2.
- Produces : confirmation (ou correction) avant de poursuivre vers le store/l'UI.

- [ ] **Step 1: Invoquer l'agent `engine-invariant-guardian`**

Conformément à `CLAUDE.md` (« Any change to `game.ts`, `deck.ts`, or `givens.ts` should be
re-verified against this test... invoke the `engine-invariant-guardian` agent right after such a
change, before moving on »), lancer cet agent maintenant. Il doit confirmer que l'invariant
central (aucune partie insoluble) tient toujours sous le modèle à piles multiples.

- [ ] **Step 2: Traiter le retour de l'agent**

Si l'agent signale un problème, revenir sur Task 1/Task 2 pour le corriger, puis relancer
`npx vitest run invariants.spec.ts` avant de considérer cette tâche terminée. Si l'agent
confirme, passer à Task 4.

---

### Task 4: Store — `GameStore`

**Files:**
- Modify (réécriture complète) : `projects/games/cryptogramme/src/lib/store/game.store.ts`

**Interfaces:**
- Consumes : `createGame`, `isPlayable`, `pileTopCard`, `reduce` de `../domain/game` (Task 1) ;
  types `Action`, `GameOptions`, `GameState`, `Sym`.
- Produces : `GameStore` avec `state`, `selectedPileTopCard: Signal<Sym | null>`,
  `canDraw: Signal<boolean>`, `playableCells: Signal<readonly boolean[]>`, et les méthodes
  `selectPile(index)`, `draw()`, `play(index)`, `restart(seed)` — consommé par Task 7
  (`lp-game-page.ts`).

- [ ] **Step 1: Réécrire le fichier**

```typescript
import { computed, signal, type Signal, type WritableSignal } from '@angular/core';
import { createGame, isPlayable, pileTopCard, reduce } from '../domain/game';
import type { Action, GameOptions, GameState } from '../domain/game';
import type { Sym } from '../domain/types';

/**
 * Façade signals au-dessus du réducteur pur (`domain/game.ts`).
 *
 * Ne contient aucune règle de jeu : chaque méthode construit une `Action` et la passe à
 * `reduce()`. C'est le réducteur qui décide de ce qui change ; le store ne fait qu'exposer l'état
 * qui en résulte sous forme de signals pour les composants.
 */
export class GameStore {
  private readonly stateSignal: WritableSignal<GameState>;

  readonly state: Signal<GameState>;
  readonly selectedPileTopCard: Signal<Sym | null>;
  readonly canDraw: Signal<boolean>;
  /** Un booléen par case du plateau : vrai si le sommet de la pile sélectionnée peut y être posé sans risque connu. */
  readonly playableCells: Signal<readonly boolean[]>;

  constructor(quoteId: string, text: string, options: GameOptions) {
    this.stateSignal = signal(createGame(quoteId, text, options));
    this.state = this.stateSignal.asReadonly();

    this.selectedPileTopCard = computed(() => {
      const state = this.stateSignal();
      return pileTopCard(state, state.selectedPile);
    });

    this.canDraw = computed(() => {
      const state = this.stateSignal();
      return state.status === 'playing' && state.deck.length > 0;
    });

    this.playableCells = computed(() => {
      const state = this.stateSignal();
      return state.board.map((_cell, index) => isPlayable(state, index));
    });
  }

  selectPile(index: number): void {
    this.dispatch({ type: 'SELECT_PILE', index });
  }

  draw(): void {
    this.dispatch({ type: 'DRAW' });
  }

  play(index: number): void {
    this.dispatch({ type: 'PLAY', index });
  }

  restart(seed: string): void {
    this.dispatch({ type: 'RESTART', seed });
  }

  private dispatch(action: Action): void {
    this.stateSignal.update((state) => reduce(state, action));
  }
}
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit -p projects/games/cryptogramme/tsconfig.lib.json`
Expected: aucune erreur sur `game.store.ts` (des erreurs peuvent encore apparaître sur
`ui/game-page/lp-game-page.ts`, non touché avant Task 7 — attendu, voir Global Constraints).

- [ ] **Step 3: Commit**

```bash
git add projects/games/cryptogramme/src/lib/store/game.store.ts
git commit -m "feat(cryptogramme): adapte le store au modele a piles multiples"
```

---

### Task 5: UI — composant `lp-cryptogram-piles`

**Files:**
- Create: `projects/games/cryptogramme/src/lib/ui/cryptogram-piles/lp-cryptogram-piles.ts`

**Interfaces:**
- Consumes : type `Sym` de `../../domain/types`.
- Produces : `LpCryptogramPiles` avec `piles: input.required<readonly (readonly Sym[])[]>`,
  `selectedPile: input<number | null>` (défaut `null`), `pileSelect: output<number>` — consommé
  par Task 7 (`lp-game-page.ts`).

Ce composant est nouveau : il ne remplace ni ne modifie `lp-cryptogram-hand` (laissé intact, non
utilisé après Task 7, voir Global Constraints).

- [ ] **Step 1: Créer le fichier**

```typescript
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Sym } from '../../domain/types';

/**
 * Les 5 piles de la main. Chaque pile est une pile LIFO indépendante : seul son sommet est
 * jouable ; les cartes en dessous restent visibles (profondeur) mais inertes au clic. Une pile
 * vide n'est pas sélectionnable.
 */
@Component({
  selector: 'lp-cryptogram-piles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="crypto-piles" [attr.aria-label]="'Main, ' + piles().length + ' piles'">
      @for (pile of piles(); track $index) {
        <button
          type="button"
          class="crypto-pile"
          [class.crypto-pile-selected]="selectedPile() === $index"
          [disabled]="pile.length === 0"
          [attr.aria-pressed]="selectedPile() === $index"
          [attr.aria-label]="pileAriaLabel(pile, $index)"
          (click)="pileSelect.emit($index)"
        >
          @if (pile.length > 0) {
            <span class="crypto-pile-card">{{ pile[pile.length - 1] }}</span>
            @if (pile.length > 1) {
              <span class="crypto-pile-depth">{{ pile.length }}</span>
            }
          } @else {
            <span class="crypto-pile-empty" aria-hidden="true">—</span>
          }
        </button>
      }
    </div>
  `,
})
export class LpCryptogramPiles {
  readonly piles = input.required<readonly (readonly Sym[])[]>();
  readonly selectedPile = input<number | null>(null);
  readonly pileSelect = output<number>();

  protected pileAriaLabel(pile: readonly Sym[], index: number): string {
    if (pile.length === 0) return `Pile ${index + 1}, vide`;
    const sommet = pile[pile.length - 1];
    return `Pile ${index + 1}, carte ${sommet}, jouable`;
  }
}
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit -p projects/games/cryptogramme/tsconfig.lib.json`
Expected: aucune erreur sur `lp-cryptogram-piles.ts`.

- [ ] **Step 3: Commit**

```bash
git add projects/games/cryptogramme/src/lib/ui/cryptogram-piles/lp-cryptogram-piles.ts
git commit -m "feat(cryptogramme): ajoute le composant des 5 piles jouables"
```

---

### Task 6: Styles — piles et visibilité au scroll

**Files:**
- Modify: `projects/games/cryptogramme/src/styles/_cryptogramme.scss`

**Interfaces:**
- Consumes : tokens du design system (`--lp-color-*`, `--lp-space-*`, `--lp-radius-*`,
  `--lp-font-*`), déjà utilisés ailleurs dans ce même fichier.
- Produces : classes `crypto-piles`, `crypto-pile`, `crypto-pile-selected`, `crypto-pile-card`,
  `crypto-pile-depth`, `crypto-pile-empty` — consommées par le template de Task 5.

Ce fichier garde sa section `// --- Main (pile LIFO) ---` existante intacte (classes
`.crypto-hand*`, encore utilisées par `lp-cryptogram-hand.stories.ts`, voir Global Constraints).
Une nouvelle section est ajoutée juste après.

- [ ] **Step 1: Lire le fichier pour repérer le point d'insertion**

Le fichier `_cryptogramme.scss` contient une section `// --- Main (pile LIFO) ---` (autour de la
ligne 86) qui se termine juste avant `// --- Pioche ---` (autour de la ligne 134). Insérer la
nouvelle section entre les deux.

- [ ] **Step 2: Ajouter la nouvelle section de styles**

Insérer, juste avant la ligne `// --- Pioche -------...` :

```scss
// --- Piles (main à 5 piles) ----------------------------------------------------------------------

.crypto-piles {
  position: sticky;
  top: var(--lp-space-2);
  z-index: 2;
  display: flex;
  gap: var(--lp-space-2);
  padding: var(--lp-space-2);
  background: var(--lp-color-surface-raised);
  border-radius: var(--lp-radius-md);
}

.crypto-pile {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 3.5rem;
  font-size: var(--lp-font-size-lg);
  font-weight: var(--lp-font-weight-bold);
  background: var(--lp-color-surface);
  border: 1px solid var(--lp-color-border);
  border-radius: var(--lp-radius-md);
  color: var(--lp-color-text);
  cursor: pointer;

  &:disabled {
    color: var(--lp-color-text-muted);
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus-visible {
    outline: 2px solid var(--lp-color-focus-ring);
    outline-offset: 2px;
  }
}

.crypto-pile-selected {
  background: var(--lp-color-primary);
  color: var(--lp-color-primary-contrast);
  border-color: var(--lp-color-primary);
}

.crypto-pile-depth {
  position: absolute;
  bottom: -0.4rem;
  right: -0.4rem;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 var(--lp-space-1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--lp-font-size-xs);
  font-weight: var(--lp-font-weight-bold);
  background: var(--lp-color-surface-raised);
  border: 1px solid var(--lp-color-border);
  border-radius: var(--lp-radius-full);
  color: var(--lp-color-text);
}

.crypto-pile-empty {
  color: var(--lp-color-text-muted);
}

```

- [ ] **Step 3: Commit**

```bash
git add projects/games/cryptogramme/src/styles/_cryptogramme.scss
git commit -m "style(cryptogramme): ajoute les styles des piles, zone collante au scroll"
```

---

### Task 7: UI — rebrancher `lp-game-page`

**Files:**
- Modify: `projects/games/cryptogramme/src/lib/ui/game-page/lp-game-page.ts`

**Interfaces:**
- Consumes : `LpCryptogramPiles` (Task 5), `GameStore.selectPile`/`draw`/`play`/`restart`/`state`/
  `canDraw`/`playableCells` (Task 4).
- Produces : rien de consommé par une tâche suivante — dernier maillon de câblage UI.

- [ ] **Step 1: Remplacer l'import et l'entrée `imports` du composant**

Dans `projects/games/cryptogramme/src/lib/ui/game-page/lp-game-page.ts`, remplacer :

```typescript
import { LpCryptogramHand } from '../cryptogram-hand/lp-cryptogram-hand';
```

par :

```typescript
import { LpCryptogramPiles } from '../cryptogram-piles/lp-cryptogram-piles';
```

et dans le tableau `imports: [...]` du décorateur `@Component`, remplacer `LpCryptogramHand` par
`LpCryptogramPiles`.

- [ ] **Step 2: Rebrancher le template**

Remplacer ce bloc :

```typescript
        <div class="crypto-page-header">
          <lp-error-counter
            [errors]="store.state().errors"
            [maxErrors]="store.state().puzzle.maxErrors"
          />
          <lp-cryptogram-deck
            [remaining]="store.state().deck.length"
            [handFull]="!store.canDraw()"
            (draw)="store.draw()"
          />
        </div>

        <lp-cryptogram-hand [hand]="store.state().hand" (playTop)="store.play()" />

        <lp-cryptogram-grid
          [board]="store.state().board"
          [selectedCell]="store.state().selectedCell"
          [playableCells]="store.playableCells()"
          (cellSelect)="store.selectCell($event)"
        />
```

par :

```typescript
        <div class="crypto-page-header">
          <lp-error-counter
            [errors]="store.state().errors"
            [maxErrors]="store.state().puzzle.maxErrors"
          />
          <lp-cryptogram-deck
            [remaining]="store.state().deck.length"
            (draw)="store.draw()"
          />
        </div>

        <lp-cryptogram-piles
          [piles]="store.state().piles"
          [selectedPile]="store.state().selectedPile"
          (pileSelect)="store.selectPile($event)"
        />

        <lp-cryptogram-grid
          [board]="store.state().board"
          [playableCells]="store.playableCells()"
          (cellSelect)="store.play($event)"
        />
```

Note : `[handFull]` et `[selectedCell]` sont retirés (pas supprimés du composant cible — voir
Global Constraints) plutôt que passés à une valeur statique, pour que l'absence de binding soit
explicite dans le diff.

- [ ] **Step 3: Vérifier la compilation TypeScript du projet complet**

Run: `npx tsc --noEmit -p projects/games/cryptogramme/tsconfig.lib.json`
Expected: aucune erreur. C'est le premier moment où la totalité de la chaîne domaine → store → UI
recompile proprement.

- [ ] **Step 4: Lancer la suite de tests domaine complète**

Run: `npm test`
Expected: PASS, tous les fichiers.

- [ ] **Step 5: Commit**

```bash
git add projects/games/cryptogramme/src/lib/ui/game-page/lp-game-page.ts
git commit -m "feat(cryptogramme): branche l'ecran de jeu sur le modele a 5 piles"
```

---

### Task 8: Vérification manuelle de bout en bout (navigateur)

**Files:** aucun — tâche de vérification uniquement.

**Interfaces:**
- Consumes : l'application buildée après Task 7.
- Produces : confirmation que le gameplay fonctionne réellement, pas seulement au niveau des
  tests unitaires.

- [ ] **Step 1: Servir l'application sur un port dédié**

Dans le worktree de ce chantier (mis en place par `superpowers:using-git-worktrees` avant Task 1) :

```bash
npx ng serve portal --port 4300
```

Le port 4300 (au lieu du port par défaut 4200) évite toute collision avec une autre session
travaillant en parallèle sur ce dépôt (ex. une autre session Claude sur une autre issue).

- [ ] **Step 2: Ouvrir l'application dans le navigateur (`claude-in-chrome`)**

Naviguer vers `http://localhost:4300/cryptogramme` (ou la route du jeu telle qu'exposée par
`routes.ts`).

- [ ] **Step 3: Vérifier le cycle de jeu complet**

- Cliquer la pioche : les 5 piles doivent se remplir (une carte chacune, ou moins si la citation
  est très courte).
- Cliquer une pile non vide : elle doit se marquer visuellement comme sélectionnée.
- Cliquer la même pile à nouveau : elle doit se désélectionner.
- Sélectionner une pile, puis cliquer une case-lettre vide correcte pour cette carte : la case se
  remplit, la pile se désélectionne, son sommet passe à la carte suivante (ou redevient vide/marquée
  « — » si elle n'avait qu'une carte).
- Sélectionner une pile, cliquer une case-lettre vide incorrecte : le compteur d'erreurs augmente,
  la pile se désélectionne, la carte reste en place.
- Repiocher : les piles déjà non vides doivent s'empiler (la profondeur affichée augmente) plutôt
  que de bloquer la pioche.
- Faire défiler la page sur une citation assez longue pour dépasser la hauteur de l'écran : la
  zone des piles doit rester visible (comportement collant) pendant le scroll.
- Jouer jusqu'à la victoire (toutes les cases remplies) ou la défaite (3 erreurs) : l'écran de
  résultat doit s'afficher normalement.

- [ ] **Step 4: Signaler tout écart au comportement attendu**

Si un point du Step 3 échoue, revenir sur la tâche concernée (Task 1 pour les règles, Task 5/6/7
pour l'affichage/le câblage) avant de considérer ce plan terminé.
