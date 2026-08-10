import { describe, it, expect } from 'vitest';
import { candidateToQuote, classifyAuthor, groupByTheme, toQuoteId } from './import-quotekg-candidates';
import type { QuoteKgCandidate } from './import-quotekg-candidates';
import type { Quote } from './quote-schema';

function candidate(overrides: Partial<QuoteKgCandidate> = {}): QuoteKgCandidate {
  return {
    author: 'Anonyme',
    text: '  Une citation quelconque.  ',
    context: null,
    sourceUrl: 'https://fr.wikiquote.org/wiki/X',
    quality: 0.9,
    ...overrides,
  };
}

describe('classifyAuthor', () => {
  it('applique le défaut prudent pour un auteur inconnu', () => {
    expect(classifyAuthor('Auteur Jamais Vu')).toEqual({
      theme: 'litterature',
      notoriety: 3,
      publicDomain: false,
    });
  });

  it("retourne le domaine public pour un auteur classé mort depuis plus de 70 ans", () => {
    expect(classifyAuthor('Voltaire').publicDomain).toBe(true);
  });

  it("refuse le domaine public pour un auteur vivant ou récent malgré sa présence dans la table", () => {
    expect(classifyAuthor('Zinedine Zidane').publicDomain).toBe(false);
  });
});

describe('toQuoteId', () => {
  it('formate un identifiant préfixé et complété à 6 chiffres', () => {
    expect(toQuoteId(1)).toBe('quotekg-000001');
    expect(toQuoteId(123456)).toBe('quotekg-123456');
  });
});

describe('candidateToQuote', () => {
  it('coupe les espaces du texte', () => {
    expect(candidateToQuote(candidate(), 1).text).toBe('Une citation quelconque.');
  });

  it('reprend le contexte comme source quand il est présent', () => {
    const q = candidateToQuote(candidate({ context: 'Le Rouge et le Noir, 1830' }), 1);
    expect(q.source).toBe('Le Rouge et le Noir, 1830');
  });

  it('retombe sur "Wikiquote" quand le contexte est absent', () => {
    expect(candidateToQuote(candidate({ context: null }), 1).source).toBe('Wikiquote');
  });

  it("applique la classification de l'auteur", () => {
    const q = candidateToQuote(candidate({ author: 'Voltaire' }), 1);
    expect(q).toMatchObject({ theme: 'litterature', notoriety: 5, publicDomain: true });
  });

  it("dérive l'id de la position dans le lot, pas du contenu", () => {
    expect(candidateToQuote(candidate(), 42).id).toBe('quotekg-000042');
  });

  it('fixe lang à fr', () => {
    expect(candidateToQuote(candidate(), 1).lang).toBe('fr');
  });
});

describe('groupByTheme', () => {
  it('répartit les citations dans les quatre thèmes, y compris ceux restés vides', () => {
    const quotes: Quote[] = [
      { ...candidateToQuote(candidate({ author: 'Voltaire' }), 1) },
      { ...candidateToQuote(candidate({ author: 'Maximilien Robespierre' }), 2) },
    ];
    const grouped = groupByTheme(quotes);
    expect(grouped.litterature).toHaveLength(1);
    expect(grouped.historique).toHaveLength(1);
    expect(grouped.scientifique).toHaveLength(0);
    expect(grouped['pop-culture']).toHaveLength(0);
  });
});
