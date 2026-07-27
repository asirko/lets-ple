import { describe, it, expect } from 'vitest';
import { createRng } from './rng';
import { pickGivens } from './givens';
import { isVowel } from './alphabet';

const counts = new Map([
  ['E', 12],
  ['A', 8],
  ['S', 7],
  ['R', 5],
  ['T', 4],
  ['Ê', 1],
  ['W', 1],
]);

const GRAINES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

describe('pickGivens', () => {
  it('retourne le nombre demandé', () => {
    expect(pickGivens(counts, 3, createRng('s')).size).toBe(3);
    expect(pickGivens(counts, 2, createRng('s')).size).toBe(2);
  });

  it('borne le nombre entre 2 et 3', () => {
    expect(pickGivens(counts, 9, createRng('s')).size).toBe(3);
    expect(pickGivens(counts, 0, createRng('s')).size).toBe(2);
  });

  it('inclut toujours au moins une voyelle', () => {
    for (const graine of GRAINES) {
      const givens = [...pickGivens(counts, 3, createRng(graine))];
      expect(givens.some(isVowel)).toBe(true);
    }
  });

  it('ne choisit jamais un symbole rare quand des fréquents existent', () => {
    for (const graine of GRAINES) {
      const givens = pickGivens(counts, 3, createRng(graine));
      expect(givens.has('Ê')).toBe(false);
      expect(givens.has('W')).toBe(false);
    }
  });

  it('laisse toujours au moins un symbole à deviner', () => {
    // Offrir les deux symboles d'un texte qui n'en compte que deux livrerait une grille
    // déjà résolue : la règle « au moins un à deviner » prime sur le minimum de deux cadeaux.
    const petit = new Map([
      ['A', 3],
      ['B', 2],
    ]);
    expect(pickGivens(petit, 3, createRng('s')).size).toBe(1);

    const hapax = new Map([
      ['A', 1],
      ['B', 1],
      ['C', 1],
    ]);
    expect(pickGivens(hapax, 3, createRng('s')).size).toBe(2);
  });

  it("n'offre rien sur un texte à symbole unique", () => {
    expect(pickGivens(new Map([['A', 4]]), 3, createRng('s')).size).toBe(0);
  });

  it('est déterministe pour une même graine', () => {
    expect([...pickGivens(counts, 3, createRng('s'))]).toEqual([
      ...pickGivens(counts, 3, createRng('s')),
    ]);
  });
});
