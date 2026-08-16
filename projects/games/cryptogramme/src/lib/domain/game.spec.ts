import { describe, it, expect } from 'vitest';
import { createGame, reduce, pileTopCard, isPlayable } from './game';
import type { GameState } from './game';

const CITATION = "L'idee vient en marchant.";
const nouvelleP = () => createGame('q1', CITATION, { seed: 'test-1' });

const enMain = (s: GameState) => s.piles.reduce((total, pile) => total + pile.length, 0);

/** Sélectionne la première pile non vide dont le sommet est correct sur une case, puis pose. */
function poserJuste(state: GameState): GameState {
  for (let pileIndex = 0; pileIndex < state.piles.length; pileIndex++) {
    const carte = pileTopCard(state, pileIndex);
    if (carte === null) continue;
    const index = state.board.findIndex(
      (c, i) => c.kind === 'letter' && c.filled === null && state.puzzle.solution[i] === carte,
    );
    if (index >= 0) {
      return reduce(reduce(state, { type: 'SELECT_PILE', index: pileIndex }), {
        type: 'PLAY',
        index,
      });
    }
  }
  throw new Error('aucune pose juste possible');
}

/** Sélectionne la première pile non vide, puis pose son sommet sur une case où il est faux. */
function poserFaux(state: GameState): GameState {
  for (let pileIndex = 0; pileIndex < state.piles.length; pileIndex++) {
    const carte = pileTopCard(state, pileIndex);
    if (carte === null) continue;
    const index = state.board.findIndex(
      (c, i) => c.kind === 'letter' && c.filled === null && state.puzzle.solution[i] !== carte,
    );
    if (index >= 0) {
      return reduce(reduce(state, { type: 'SELECT_PILE', index: pileIndex }), {
        type: 'PLAY',
        index,
      });
    }
  }
  throw new Error('aucune pose fausse possible');
}

describe('createGame', () => {
  it('démarre en cours, sans erreur et piles vides', () => {
    const s = nouvelleP();
    expect(s.status).toBe('playing');
    expect(s.errors).toBe(0);
    expect(s.piles).toHaveLength(5);
    expect(s.piles.every((p) => p.length === 0)).toBe(true);
  });

  it('offre entre 2 et 3 correspondances', () => {
    expect(nouvelleP().known.size).toBeGreaterThanOrEqual(2);
    expect(nouvelleP().known.size).toBeLessThanOrEqual(3);
  });

  it('applique les valeurs par défaut du spec', () => {
    const s = nouvelleP();
    expect(s.puzzle.pileCount).toBe(5);
    expect(s.puzzle.maxErrors).toBe(3);
    expect(s.puzzle.accentMode).toBe('distinct');
  });

  it('est reproductible pour une même graine', () => {
    expect(createGame('q1', CITATION, { seed: 'x' }).deck).toEqual(
      createGame('q1', CITATION, { seed: 'x' }).deck,
    );
  });

  it('respecte l’invariant dès la création', () => {
    const s = nouvelleP();
    const vides = s.board.filter((c) => c.kind === 'letter' && c.filled === null).length;
    expect(s.deck.length + enMain(s)).toBe(vides);
  });
});

describe('DRAW', () => {
  it('distribue jusqu’à pileCount cartes, une par pile', () => {
    const avant = nouvelleP();
    const s = reduce(avant, { type: 'DRAW' });
    const attendu = Math.min(5, avant.deck.length);
    expect(enMain(s)).toBe(attendu);
    expect(s.deck).toHaveLength(avant.deck.length - attendu);
    for (let i = 0; i < 5; i++) expect(s.piles[i].length).toBe(i < attendu ? 1 : 0);
  });

  it('empile sur les piles déjà occupées plutôt que de bloquer', () => {
    let s = reduce(nouvelleP(), { type: 'DRAW' });
    s = reduce(s, { type: 'DRAW' });
    expect(s.piles.every((pile) => pile.length === 2)).toBe(true);
  });

  it('ne fait rien quand la pioche est vide', () => {
    let s = nouvelleP();
    let garde = 0;
    while (s.deck.length > 0 && garde++ < 1000) s = reduce(s, { type: 'DRAW' });
    const avant = enMain(s);
    const rejoue = reduce(s, { type: 'DRAW' });
    expect(rejoue.deck).toHaveLength(0);
    expect(enMain(rejoue)).toBe(avant);
  });

  it('en fin de pioche, ne remplit que les premières piles, dans l’ordre', () => {
    let s = nouvelleP();
    let garde = 0;
    while (s.deck.length >= 5 && garde++ < 1000) s = reduce(s, { type: 'DRAW' });
    const restant = s.deck.length;
    const avant = s.piles.map((p) => p.length);
    s = reduce(s, { type: 'DRAW' });
    expect(s.deck).toHaveLength(0);
    for (let i = 0; i < 5; i++) {
      expect(s.piles[i].length).toBe(i < restant ? avant[i] + 1 : avant[i]);
    }
  });
});

describe('PLAY', () => {
  it('ne fait rien sans pile sélectionnée', () => {
    const s = reduce(nouvelleP(), { type: 'DRAW' });
    const cible = s.board.findIndex((c) => c.kind === 'letter' && c.filled === null);
    expect(reduce(s, { type: 'PLAY', index: cible })).toEqual(s);
  });

  it('ne fait rien sur une pile vide', () => {
    const s = nouvelleP();
    const cible = s.board.findIndex((c) => c.kind === 'letter' && c.filled === null);
    const apres = reduce(reduce(s, { type: 'SELECT_PILE', index: 0 }), {
      type: 'PLAY',
      index: cible,
    });
    expect(apres).toEqual(s);
  });

  it('remplit la case et révèle la correspondance sur une pose juste', () => {
    const avant = reduce(nouvelleP(), { type: 'DRAW' });
    const apres = poserJuste(avant);
    expect(apres.errors).toBe(0);
    expect(enMain(apres)).toBe(enMain(avant) - 1);
    expect(apres.known.size).toBe(avant.known.size + 1);
    expect(apres.selectedPile).toBeNull();
  });

  it('compte une erreur et garde la carte sur une pose fausse', () => {
    const avant = reduce(nouvelleP(), { type: 'DRAW' });
    const apres = poserFaux(avant);
    expect(apres.errors).toBe(1);
    expect(apres.piles).toEqual(avant.piles);
    expect(apres.selectedPile).toBeNull();
  });

  it('perd la partie à la troisième erreur', () => {
    let s = reduce(nouvelleP(), { type: 'DRAW' });
    for (let i = 0; i < 3; i++) s = poserFaux(s);
    expect(s.errors).toBe(3);
    expect(s.status).toBe('lost');
  });

  it('ignore toute action une fois la partie terminée', () => {
    let s = reduce(nouvelleP(), { type: 'DRAW' });
    for (let i = 0; i < 3; i++) s = poserFaux(s);
    expect(reduce(s, { type: 'DRAW' })).toEqual(s);
  });

  it('gagne la partie quand toutes les cases sont remplies', () => {
    let s = createGame('q', 'ABA', { seed: 'g' });
    let garde = 0;
    while (s.status === 'playing' && garde++ < 50) {
      s = enMain(s) === 0 ? reduce(s, { type: 'DRAW' }) : poserJuste(s);
    }
    expect(s.status).toBe('won');
    expect(s.errors).toBe(0);
  });
});

describe('SELECT_PILE', () => {
  it('désélectionne quand on reclique la même pile', () => {
    const s = reduce(nouvelleP(), { type: 'DRAW' });
    const apres = reduce(s, { type: 'SELECT_PILE', index: 0 });
    expect(reduce(apres, { type: 'SELECT_PILE', index: 0 }).selectedPile).toBeNull();
  });

  it('sélectionne une pile différente sans repasser par null', () => {
    const s = reduce(nouvelleP(), { type: 'DRAW' });
    const apres = reduce(s, { type: 'SELECT_PILE', index: 0 });
    expect(reduce(apres, { type: 'SELECT_PILE', index: 1 }).selectedPile).toBe(1);
  });

  it('refuse une pile vide', () => {
    const s = nouvelleP();
    expect(reduce(s, { type: 'SELECT_PILE', index: 0 }).selectedPile).toBeNull();
  });
});

describe('isPlayable', () => {
  it('exclut une case dont le code résolu contredit le sommet de la pile sélectionnée', () => {
    const s = reduce(reduce(nouvelleP(), { type: 'DRAW' }), { type: 'SELECT_PILE', index: 0 });
    const carte = pileTopCard(s, 0)!;
    const contredite = s.board.findIndex(
      (c) =>
        c.kind === 'letter' &&
        c.filled === null &&
        s.known.has(c.code) &&
        s.known.get(c.code) !== carte,
    );
    if (contredite >= 0) expect(isPlayable(s, contredite)).toBe(false);
  });

  it('accepte une case dont le code est inconnu', () => {
    const s = reduce(reduce(nouvelleP(), { type: 'DRAW' }), { type: 'SELECT_PILE', index: 0 });
    const inconnue = s.board.findIndex(
      (c) => c.kind === 'letter' && c.filled === null && !s.known.has(c.code),
    );
    expect(isPlayable(s, inconnue)).toBe(true);
  });

  it('refuse toute case si aucune pile n’est sélectionnée', () => {
    const s = reduce(nouvelleP(), { type: 'DRAW' });
    const vide = s.board.findIndex((c) => c.kind === 'letter' && c.filled === null);
    expect(isPlayable(s, vide)).toBe(false);
  });
});

describe('RESTART', () => {
  it('rejoue la même citation avec un chiffrement différent', () => {
    const avant = nouvelleP();
    const apres = reduce(avant, { type: 'RESTART', seed: 'autre-graine' });
    expect(apres.puzzle.text).toBe(avant.puzzle.text);
    expect(apres.status).toBe('playing');
    expect(apres.errors).toBe(0);
    expect(apres.piles.every((p) => p.length === 0)).toBe(true);
    expect(apres.deck).not.toEqual(avant.deck);
  });
});
