import { describe, it, expect } from 'vitest';
import { filterCandidates } from './filter-quotekg-candidates';

function quote(quality: number, text = 'peu importe') {
  return {
    author: 'Anonyme',
    text,
    context: null,
    sourceUrl: 'https://fr.wikiquote.org/wiki/X',
    quality,
  };
}

describe('filterCandidates', () => {
  it('rejette les scores strictement sous le seuil', () => {
    expect(filterCandidates([quote(0.69)], 0.7)).toEqual([]);
  });

  it('garde les scores égaux au seuil', () => {
    expect(filterCandidates([quote(0.7)], 0.7)).toHaveLength(1);
  });

  it('garde les scores au-dessus du seuil', () => {
    expect(filterCandidates([quote(1)], 0.7)).toHaveLength(1);
  });

  it('filtre un mélange en préservant les citations retenues intactes', () => {
    const kept = quote(0.9, 'Une citation retenue.');
    const result = filterCandidates([quote(0.2), kept, quote(0.5)], 0.7);
    expect(result).toEqual([kept]);
  });
});
