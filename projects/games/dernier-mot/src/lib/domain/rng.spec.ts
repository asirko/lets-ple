import { describe, expect, it } from 'vitest';
import { createSeededRandom, pickIndex } from './rng';

describe('rng', () => {
  it('reproduit la même suite pour une même graine', () => {
    const first = createSeededRandom('partie-42');
    const second = createSeededRandom('partie-42');

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it('choisit toujours un index dans les bornes', () => {
    expect(pickIndex('partie-42', 4)).toBeGreaterThanOrEqual(0);
    expect(pickIndex('partie-42', 4)).toBeLessThan(4);
  });
});
