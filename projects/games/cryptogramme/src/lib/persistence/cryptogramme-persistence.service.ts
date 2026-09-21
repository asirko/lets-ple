import { Injectable, inject } from '@angular/core';
import { StorageService } from '@lets-ple/game-core';
import { createGame, type GameState } from '../domain/game';

export interface SavedCryptogramme {
  readonly state: GameState;
  readonly author: string;
  readonly source: string;
  readonly minLetters: number | null;
  readonly maxLetters: number | null;
}

const KEY = 'cryptogramme:activeGame';
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown, minimum: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
const filter = (value: unknown): value is number | null => value === null || integer(value, 1);
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Valide la sauvegarde avant de reconstruire les correspondances sérialisées en Map. */
function restore(raw: unknown): SavedCryptogramme | null {
  if (!record(raw) || raw['version'] !== 1 || !record(raw['state'])) return null;
  if (typeof raw['author'] !== 'string' || typeof raw['source'] !== 'string') return null;
  let minLetters = filter(raw['minLetters']) ? raw['minLetters'] : null;
  let maxLetters = filter(raw['maxLetters']) ? raw['maxLetters'] : null;
  if (minLetters !== null && maxLetters !== null && minLetters > maxLetters) {
    minLetters = null;
    maxLetters = null;
  }
  const state = raw['state'];
  const puzzle = state['puzzle'];
  const board = state['board'];
  const entries = state['known'];
  const hand = state['hand'];
  const deck = state['deck'];
  if (
    !record(puzzle) ||
    !Array.isArray(board) ||
    !Array.isArray(entries) ||
    !Array.isArray(hand) ||
    !Array.isArray(deck)
  )
    return null;
  if (
    typeof puzzle['quoteId'] !== 'string' ||
    typeof puzzle['text'] !== 'string' ||
    typeof puzzle['seed'] !== 'string'
  )
    return null;
  if (puzzle['accentMode'] !== 'distinct' && puzzle['accentMode'] !== 'merged') return null;
  if (!integer(puzzle['handCapacity'], 1) || !integer(puzzle['maxErrors'], 1)) return null;
  if (
    !integer(state['errors'], 0) ||
    state['errors'] > puzzle['maxErrors'] ||
    hand.length > puzzle['handCapacity']
  )
    return null;
  if (!board.every(record)) return null;
  const givenCount = new Set(
    board.filter((cell) => cell['given'] === true).map((cell) => cell['code']),
  ).size;
  const initial = createGame(puzzle['quoteId'], puzzle['text'], {
    seed: puzzle['seed'],
    accentMode: puzzle['accentMode'],
    handCapacity: puzzle['handCapacity'],
    maxErrors: puzzle['maxErrors'],
    givenCount,
  });
  if (board.length !== initial.board.length || !equal(puzzle['solution'], initial.puzzle.solution))
    return null;
  const known = new Map<number, string>();
  for (const entry of entries) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      !integer(entry[0], 1) ||
      typeof entry[1] !== 'string' ||
      known.has(entry[0])
    )
      return null;
    known.set(entry[0], entry[1]);
  }
  const revealed = new Map<number, string>();
  const remaining = new Map<string, number>();
  for (const [index, original] of initial.board.entries()) {
    const cell = board[index];
    if (cell['kind'] !== original.kind || cell['char'] !== original.char) return null;
    if (original.kind === 'fixed') continue;
    const solution = initial.puzzle.solution[index]!;
    if (cell['code'] !== original.code || cell['given'] !== original.given) return null;
    if (cell['filled'] !== null && cell['filled'] !== solution) return null;
    if (original.given && cell['filled'] !== original.filled) return null;
    if (cell['filled'] !== null) revealed.set(original.code, solution);
    else remaining.set(solution, (remaining.get(solution) ?? 0) + 1);
  }
  if (known.size !== revealed.size || [...revealed].some(([code, sym]) => known.get(code) !== sym))
    return null;
  for (const card of [...deck, ...hand]) {
    if (typeof card !== 'string' || !remaining.get(card)) return null;
    remaining.set(card, remaining.get(card)! - 1);
  }
  if ([...remaining.values()].some((count) => count !== 0)) return null;
  const expectedStatus =
    state['errors'] === puzzle['maxErrors']
      ? 'lost'
      : deck.length + hand.length === 0
        ? 'won'
        : 'playing';
  if (state['status'] !== expectedStatus) return null;
  const selected = state['selectedCell'];
  if (
    selected !== null &&
    (!integer(selected, 0) ||
      !board[selected] ||
      board[selected]['kind'] !== 'letter' ||
      board[selected]['filled'] !== null ||
      expectedStatus !== 'playing')
  )
    return null;
  return {
    state: {
      puzzle: initial.puzzle,
      board: board as unknown as GameState['board'],
      known,
      deck: deck as string[],
      hand: hand as string[],
      errors: state['errors'],
      selectedCell: selected as number | null,
      status: expectedStatus,
    },
    author: raw['author'],
    source: raw['source'],
    minLetters,
    maxLetters,
  };
}

@Injectable({ providedIn: 'root' })
export class CryptogrammePersistenceService {
  private readonly storage = inject(StorageService);

  load(): SavedCryptogramme | null {
    try {
      return restore(this.storage.read<unknown>(KEY, null));
    } catch {
      return null;
    }
  }

  save(game: SavedCryptogramme): void {
    try {
      this.storage.write(KEY, {
        ...game,
        version: 1,
        state: { ...game.state, known: [...game.state.known] },
      });
    } catch {
      /* Un quota dépassé ne doit pas interrompre une partie. */
    }
  }

  clear(): void {
    try {
      this.storage.remove(KEY);
    } catch {
      /* Le stockage peut être interdit par le navigateur. */
    }
  }
}
