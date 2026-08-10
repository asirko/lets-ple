import { describe, it, expect } from 'vitest';
import { pickRandomQuote } from './pick-random-quote';

describe('pickRandomQuote', () => {
  it('retourne l’unique élément d’une liste à un élément', () => {
    expect(pickRandomQuote(['seul'], () => 0.5)).toBe('seul');
  });

  it('choisit l’élément correspondant à la position tirée par le rng', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(pickRandomQuote(items, () => 0)).toBe('a');
    expect(pickRandomQuote(items, () => 0.99)).toBe('d');
  });

  it('lève une erreur sur une liste vide', () => {
    expect(() => pickRandomQuote([], () => 0)).toThrow();
  });
});
