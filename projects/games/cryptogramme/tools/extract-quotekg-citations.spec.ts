import { describe, it, expect } from 'vitest';
import { cleanQuoteText, isAcceptableQuote, isAllowedSource } from './extract-quotekg-citations';

describe('cleanQuoteText', () => {
  it('laisse un texte déjà propre inchangé', () => {
    expect(cleanQuoteText("Le style est l'homme même.")).toBe("Le style est l'homme même.");
  });

  it('retire les balises résiduelles (ex: <poem>)', () => {
    expect(cleanQuoteText('<poem>Les marins en plein combat</poem>')).toBe(
      'Les marins en plein combat',
    );
  });

  it('retire les gabarits wiki résiduels ({{...}})', () => {
    expect(cleanQuoteText('Une citation {{réf|page=12}} bien réelle.')).toBe(
      'Une citation bien réelle.',
    );
  });

  it('déplie les liens wiki résiduels ([[cible|libellé]]) en gardant la cible', () => {
    expect(cleanQuoteText('Voir [[Victor Hugo|le poète]] à ce sujet.')).toBe(
      'Voir Victor Hugo à ce sujet.',
    );
  });

  it('aplatit les sauts de ligne et espaces multiples', () => {
    expect(cleanQuoteText('Je me disais :\n«  Ces gens  ne souffrent pas. »')).toBe(
      'Je me disais : « Ces gens ne souffrent pas. »',
    );
  });
});

describe('isAcceptableQuote', () => {
  it('rejette un texte trop court (moins de 15 caractères alphabétiques)', () => {
    expect(isAcceptableQuote('Court.')).toBe(false);
  });

  it('accepte un texte très long — pas de plafond, un cryptogramme long est un choix voulu', () => {
    const long = 'Une phrase suffisamment longue pour dépasser toute ancienne limite. '.repeat(10);
    expect(isAcceptableQuote(long)).toBe(true);
  });

  it("accepte un texte de longueur raisonnable, digne d'une citation", () => {
    expect(isAcceptableQuote('Le cœur a ses raisons que la raison ne connaît point.')).toBe(true);
  });
});

describe('isAllowedSource', () => {
  it('accepte fr.wikiquote.org', () => {
    expect(isAllowedSource('https://fr.wikiquote.org/wiki/Victor_Hugo')).toBe(true);
  });

  it('accepte en.wikiquote.org', () => {
    expect(isAllowedSource('https://en.wikiquote.org/wiki/Marcel_Proust')).toBe(true);
  });

  it('rejette les autres Wikiquote linguistiques (mauvais étiquetage de langue plus fréquent)', () => {
    expect(isAllowedSource('https://la.wikiquote.org/wiki/Valerius_Flaccus')).toBe(false);
    expect(isAllowedSource('https://sv.wikiquote.org/wiki/Pablo_Picasso')).toBe(false);
  });

  it('rejette une URL invalide plutôt que de lever une exception', () => {
    expect(isAllowedSource('pas-une-url')).toBe(false);
  });
});
