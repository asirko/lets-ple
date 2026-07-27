import { describe, it, expect } from 'vitest';
import { toSymbols, isVowel, distinctSymbols, symbolCounts } from './alphabet';

describe('toSymbols', () => {
  it('met en majuscules et garde les accents en mode distinct', () => {
    expect(toSymbols('élève', 'distinct')).toEqual(['É', 'L', 'È', 'V', 'E']);
  });

  it('fusionne les accents en mode merged', () => {
    expect(toSymbols('élève', 'merged')).toEqual(['E', 'L', 'E', 'V', 'E']);
  });

  it('marque les caractères fixes à null', () => {
    expect(toSymbols("l'a b.", 'distinct')).toEqual(['L', null, 'A', null, 'B', null]);
  });

  it('conserve la longueur du texte', () => {
    const texte = "Rien n'est plus puissant qu'une idée.";
    expect(toSymbols(texte, 'distinct')).toHaveLength(texte.length);
  });

  it('traite la cédille comme un symbole en mode distinct', () => {
    expect(toSymbols('ça', 'distinct')).toEqual(['Ç', 'A']);
    expect(toSymbols('ça', 'merged')).toEqual(['C', 'A']);
  });
});

describe('isVowel', () => {
  it('reconnaît les voyelles accentuées', () => {
    for (const v of ['A', 'E', 'É', 'È', 'Ê', 'I', 'Ï', 'O', 'Ô', 'U', 'Ù', 'Y']) {
      expect(isVowel(v)).toBe(true);
    }
  });

  it('rejette les consonnes, y compris la cédille', () => {
    for (const c of ['B', 'K', 'Z', 'Ç']) {
      expect(isVowel(c)).toBe(false);
    }
  });
});

describe('distinctSymbols', () => {
  it("retourne les symboles uniques dans l'ordre d'apparition", () => {
    expect(distinctSymbols(['B', 'A', null, 'B', 'C'])).toEqual(['B', 'A', 'C']);
  });
});

describe('symbolCounts', () => {
  it('compte les occurrences en ignorant les cases fixes', () => {
    const counts = symbolCounts(['E', 'A', null, 'E', 'E']);
    expect(counts.get('E')).toBe(3);
    expect(counts.get('A')).toBe(1);
    expect(counts.size).toBe(2);
  });
});
