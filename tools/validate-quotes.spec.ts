import { describe, it, expect } from 'vitest';
import { validateQuotes } from './validate-quotes';
import type { Quote } from './quote-schema';

function citationValide(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'litterature-01',
    lang: 'fr',
    text: "Le doute est le commencement de la sagesse.",
    author: 'René Descartes',
    source: 'Discours de la méthode',
    theme: 'litterature',
    notoriety: 3,
    publicDomain: true,
    ...overrides,
  };
}

describe('validateQuotes', () => {
  it('accepte un corpus valide', () => {
    expect(validateQuotes([citationValide()])).toEqual([]);
  });

  it('rejette un id dupliqué dans le corpus', () => {
    const a = citationValide({ id: 'dup' });
    const b = citationValide({ id: 'dup', text: 'Une autre citation assez longue pour être valide.' });
    expect(validateQuotes([a, b])).not.toEqual([]);
  });

  it('accepte des ids tous distincts', () => {
    const a = citationValide({ id: 'a' });
    const b = citationValide({ id: 'b', text: 'Une autre citation assez longue pour être valide.' });
    expect(validateQuotes([a, b])).toEqual([]);
  });

  it('rejette un texte vide', () => {
    expect(validateQuotes([citationValide({ text: '' })])).not.toEqual([]);
  });

  it('rejette un texte de moins de 15 caractères alphabétiques', () => {
    expect(validateQuotes([citationValide({ text: 'Court.' })])).not.toEqual([]);
  });

  it('accepte un texte d’au moins 15 caractères alphabétiques', () => {
    expect(validateQuotes([citationValide({ text: 'Quinze lettres exactement.' })])).toEqual([]);
  });

  it('rejette un auteur vide', () => {
    expect(validateQuotes([citationValide({ author: '' })])).not.toEqual([]);
  });

  it('rejette une source vide', () => {
    expect(validateQuotes([citationValide({ source: '' })])).not.toEqual([]);
  });

  it('rejette un thème hors liste', () => {
    expect(validateQuotes([citationValide({ theme: 'fantaisie' as Quote['theme'] })])).not.toEqual([]);
  });

  it('accepte chacun des quatre thèmes', () => {
    for (const theme of ['litterature', 'historique', 'scientifique', 'pop-culture'] as const) {
      expect(validateQuotes([citationValide({ theme })])).toEqual([]);
    }
  });

  it('rejette une notoriété hors de 1 à 5', () => {
    expect(validateQuotes([citationValide({ notoriety: 0 as Quote['notoriety'] })])).not.toEqual([]);
    expect(validateQuotes([citationValide({ notoriety: 6 as Quote['notoriety'] })])).not.toEqual([]);
  });

  it('accepte les notoriétés de 1 à 5', () => {
    for (const notoriety of [1, 2, 3, 4, 5] as const) {
      expect(validateQuotes([citationValide({ notoriety })])).toEqual([]);
    }
  });

  it('rejette publicDomain absent ou non booléen', () => {
    const { publicDomain, ...sansChamp } = citationValide();
    expect(validateQuotes([sansChamp as unknown as Quote])).not.toEqual([]);
    expect(validateQuotes([citationValide({ publicDomain: 'oui' as unknown as boolean })])).not.toEqual([]);
  });
});
