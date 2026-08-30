import { describe, expect, it } from 'vitest';
import { normalizeWord } from './normalize-word';

describe('normalizeWord', () => {
  it('fusionne casse et accents', () => {
    expect(normalizeWord('Élève')).toBe('ELEVE');
  });

  it('normalise les accents décomposés et la casse française', () => {
    expect(normalizeWord('à côté de Noël')).toBe('A COTE DE NOEL');
  });

  it('décompose les ligatures françaises et latines', () => {
    expect(normalizeWord('œuf cœur œuvre encyclopædie Æsir')).toBe(
      'OEUF COEUR OEUVRE ENCYCLOPAEDIE AESIR',
    );
  });
});
