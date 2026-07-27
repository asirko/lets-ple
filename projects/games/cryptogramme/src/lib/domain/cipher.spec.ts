import { describe, it, expect } from 'vitest';
import { createRng } from './rng';
import { buildCipher } from './cipher';

describe('buildCipher', () => {
  it('associe un nombre distinct à chaque symbole', () => {
    const cipher = buildCipher(['A', 'B', 'C'], createRng('s'));
    expect(cipher.size).toBe(3);
    expect(new Set(cipher.values()).size).toBe(3);
  });

  it('utilise les nombres de 1 à N sans trou', () => {
    const cipher = buildCipher(['A', 'B', 'C', 'D'], createRng('s'));
    expect([...cipher.values()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it('est déterministe pour une même graine', () => {
    const a = buildCipher(['A', 'B', 'C'], createRng('s'));
    const b = buildCipher(['A', 'B', 'C'], createRng('s'));
    expect([...a]).toEqual([...b]);
  });

  it('produit des attributions différentes selon la graine', () => {
    const a = buildCipher([...'ABCDEFGHIJ'], createRng('graine-1'));
    const b = buildCipher([...'ABCDEFGHIJ'], createRng('graine-2'));
    expect([...a]).not.toEqual([...b]);
  });
});
