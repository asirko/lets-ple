import { describe, it, expect } from 'vitest';
import { buildCipher } from './cipher';
import { createRng } from './rng';
import { buildBoard } from './board';

// toSymbols("L'été.") donne : L, null, É, T, É, null
const TEXTE = "L'été.";

describe('buildBoard', () => {
  const cipher = buildCipher(['L', 'É', 'T'], createRng('s'));

  it('produit une case par caractère', () => {
    expect(buildBoard(TEXTE, 'distinct', cipher, new Set())).toHaveLength(TEXTE.length);
  });

  it('marque apostrophe et ponctuation comme cases fixes', () => {
    const board = buildBoard(TEXTE, 'distinct', cipher, new Set());
    expect(board[1]).toEqual({ kind: 'fixed', char: "'" });
    expect(board[5]).toEqual({ kind: 'fixed', char: '.' });
  });

  it('donne le même code aux occurrences du même symbole', () => {
    const board = buildBoard(TEXTE, 'distinct', cipher, new Set());
    expect(board[2]).toMatchObject({ kind: 'letter', code: cipher.get('É') });
    expect(board[4]).toMatchObject({ kind: 'letter', code: cipher.get('É') });
  });

  it("conserve le caractère accentué d'origine", () => {
    const board = buildBoard(TEXTE, 'distinct', cipher, new Set());
    expect(board[2]).toMatchObject({ char: 'é' });
  });

  it('pré-remplit les cases offertes et laisse les autres vides', () => {
    const board = buildBoard(TEXTE, 'distinct', cipher, new Set(['É']));
    expect(board[2]).toMatchObject({ filled: 'É', given: true });
    expect(board[0]).toMatchObject({ filled: null, given: false });
  });
});
