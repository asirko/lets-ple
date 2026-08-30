import { describe, expect, it } from 'vitest';
import { createMemoryDictionary } from './dictionary';
import { createMatch, reduce, type GameState } from './game';

const dictionary = createMemoryDictionary(['CHAT', 'CHATON', 'CHIEN', 'CHIC', 'CHOC']);

function expectInvariants(state: GameState): void {
  expect(state.players.filter((player) => player.active).length).toBeGreaterThanOrEqual(
    state.phase === 'turn' ? 2 : 1,
  );
  expect(state.players.every((player) => player.score >= 0)).toBe(true);
  expect(state.prefix).toMatch(/^[A-Z]*$/);
}

describe('invariants du moteur Dernier Mot', () => {
  it('conserve les invariants à chaque transition', () => {
    let state = createMatch(['Alice', 'Benoit', 'Chloe'], dictionary, 'invariants');
    expectInvariants(state);

    for (const action of [
      { type: 'PLAY_LETTER' as const, letter: 'C' },
      { type: 'ACKNOWLEDGE_RESULT' as const },
      { type: 'PLAY_LETTER' as const, letter: 'H' },
      { type: 'ACKNOWLEDGE_RESULT' as const },
      { type: 'PLAY_LETTER' as const, letter: 'Z' },
      { type: 'ACKNOWLEDGE_RESULT' as const },
    ]) {
      state = reduce(state, action, dictionary);
      expectInvariants(state);
    }
  });
});
