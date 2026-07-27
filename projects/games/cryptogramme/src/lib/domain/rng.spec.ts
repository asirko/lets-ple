import { describe, it, expect } from 'vitest';
import { createRng, shuffle } from './rng';

describe('createRng', () => {
  it('produit la même suite pour une même graine', () => {
    const a = createRng('abc');
    const b = createRng('abc');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produit des suites différentes pour des graines différentes', () => {
    const a = createRng('abc');
    const b = createRng('xyz');
    expect(a()).not.toBe(b());
  });

  it('reste dans [0, 1)', () => {
    const rng = createRng('graine');
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('conserve tous les éléments', () => {
    const source = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = shuffle(source, createRng('s'));
    expect([...result].sort()).toEqual(source);
  });

  it("n'altère pas le tableau source", () => {
    const source = [1, 2, 3, 4, 5];
    shuffle(source, createRng('s'));
    expect(source).toEqual([1, 2, 3, 4, 5]);
  });

  it('est déterministe pour une même graine', () => {
    const source = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(source, createRng('s'))).toEqual(shuffle(source, createRng('s')));
  });
});
