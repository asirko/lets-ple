import { describe, it, expect } from 'vitest';
import { toSymbols } from './alphabet';
import { createRng } from './rng';
import { buildDeck } from './deck';

describe('buildDeck', () => {
  const solution = toSymbols('ELEVE', 'distinct'); // E, L, E, V, E

  it('contient une carte par case non offerte', () => {
    expect(buildDeck(solution, new Set(), createRng('s'))).toHaveLength(5);
  });

  it("répète une carte autant de fois que le symbole apparaît", () => {
    const deck = buildDeck(solution, new Set(), createRng('s'));
    expect(deck.filter((s) => s === 'E')).toHaveLength(3);
  });

  it('exclut toutes les cartes des symboles offerts', () => {
    const deck = buildDeck(solution, new Set(['E']), createRng('s'));
    expect(deck).toHaveLength(2);
    expect(deck).not.toContain('E');
  });

  it('est déterministe pour une même graine', () => {
    expect(buildDeck(solution, new Set(), createRng('s'))).toEqual(
      buildDeck(solution, new Set(), createRng('s')),
    );
  });
});
