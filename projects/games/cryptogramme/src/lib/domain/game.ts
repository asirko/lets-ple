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
