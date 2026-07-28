import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computeFactors, computeScore, toTier } from './difficulty';

const CORPUS_DIR = join(__dirname, '..', 'content', 'quotes');

function loadCorpus(): Array<{ text: string; notoriety: number }> {
  return readdirSync(CORPUS_DIR)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(CORPUS_DIR, f), 'utf8')));
}

describe('computeScore — propriétés de monotonie', () => {
  it('un texte riche en K W X Y Z Q J score plus haut qu’un texte de même longueur sans eux', () => {
    const richeEnRares = computeFactors('KXWZYQJ KXWZYQJ KXWZYQJ', 'distinct');
    const richeEnCommunes = computeFactors('AEIOULN AEIOULN AEIOULN', 'distinct');
    expect(computeScore(richeEnRares, 3)).toBeGreaterThan(computeScore(richeEnCommunes, 3));
  });

  it('un texte à nombreux mots courts score plus bas qu’un texte de mots longs équivalent', () => {
    const motsCourts = computeFactors('AA BB CC DD EE FF GG HH II JJ', 'distinct');
    const motsLongs = computeFactors('AABB CCDD EEFF GGHH IIJJ', 'distinct');
    expect(computeScore(motsCourts, 3)).toBeLessThan(computeScore(motsLongs, 3));
  });

  it('une citation notoire (5) score plus bas que la même à notoriété 1', () => {
    const factors = computeFactors("Rien n'est plus puissant qu'une idée dont l'heure est venue.", 'distinct');
    expect(computeScore(factors, 5)).toBeLessThan(computeScore(factors, 1));
  });

  it('le score reste dans [0, 100] sur tout le corpus témoin', () => {
    for (const quote of loadCorpus()) {
      const factors = computeFactors(quote.text, 'distinct');
      const score = computeScore(factors, quote.notoriety);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('toTier', () => {
  it('couvre les cinq paliers sans trou aux bornes', () => {
    expect(toTier(0)).toBe(1);
    expect(toTier(19)).toBe(1);
    expect(toTier(20)).toBe(2);
    expect(toTier(39)).toBe(2);
    expect(toTier(40)).toBe(3);
    expect(toTier(59)).toBe(3);
    expect(toTier(60)).toBe(4);
    expect(toTier(79)).toBe(4);
    expect(toTier(80)).toBe(5);
    expect(toTier(100)).toBe(5);
  });
});
