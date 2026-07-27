import { describe, it, expect } from 'vitest';
import { createGame, reduce, topCard, isPlayable } from './game';
import type { GameState } from './game';

const CITATION = "L'idee vient en marchant.";
const nouvelleP = () => createGame('q1', CITATION, { seed: 'test-1' });

/** Pose la carte du dessus sur une case où elle est correcte. */
function poserJuste(state: GameState): GameState {
  const carte = topCard(state)!;
  const index = state.board.findIndex(
    (c, i) => c.kind === 'letter' && c.filled === null && state.puzzle.solution[i] === carte,
  );
  return reduce(reduce(state, { type: 'SELECT_CELL', index }), { type: 'PLAY' });
}

/** Pose la carte du dessus sur une case où elle est fausse. */
function poserFaux(state: GameState): GameState {
  const carte = topCard(state)!;
  const index = state.board.findIndex(
    (c, i) => c.kind === 'letter' && c.filled === null && state.puzzle.solution[i] !== carte,
  );
  return reduce(reduce(state, { type: 'SELECT_CELL', index }), { type: 'PLAY' });
}

describe('createGame', () => {
  it('démarre en cours, sans erreur et main vide', () => {
    const s = nouvelleP();
    expect(s.status).toBe('playing');
    expect(s.errors).toBe(0);
    expect(s.hand).toHaveLength(0);
  });

  it('offre entre 2 et 3 correspondances', () => {
    expect(nouvelleP().known.size).toBeGreaterThanOrEqual(2);
    expect(nouvelleP().known.size).toBeLessThanOrEqual(3);
  });

  it('applique les valeurs par défaut du spec', () => {
    const s = nouvelleP();
    expect(s.puzzle.handCapacity).toBe(5);
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
    expect(s.deck.length + s.hand.length).toBe(vides);
  });
});

describe('DRAW', () => {
  it('déplace une carte de la pioche vers la main', () => {
    const s = reduce(nouvelleP(), { type: 'DRAW' });
    expect(s.hand).toHaveLength(1);
    expect(s.deck).toHaveLength(nouvelleP().deck.length - 1);
  });

  it('refuse au-delà de la capacité de main', () => {
    let s = nouvelleP();
    for (let i = 0; i < 8; i++) s = reduce(s, { type: 'DRAW' });
    expect(s.hand).toHaveLength(5);
  });

  it('réautorise la pioche après une pose', () => {
    let s = nouvelleP();
    for (let i = 0; i < 5; i++) s = reduce(s, { type: 'DRAW' });
    const apres = reduce(poserJuste(s), { type: 'DRAW' });
    expect(apres.hand).toHaveLength(5);
  });
});

describe('PLAY', () => {
  it('ne fait rien sans case sélectionnée', () => {
    const s = reduce(nouvelleP(), { type: 'DRAW' });
    expect(reduce(s, { type: 'PLAY' })).toEqual(s);
  });

  it('ne fait rien sans carte en main', () => {
    const s = reduce(nouvelleP(), { type: 'SELECT_CELL', index: 0 });
    expect(reduce(s, { type: 'PLAY' })).toEqual(s);
  });

  it('remplit la case et révèle la correspondance sur une pose juste', () => {
    const avant = reduce(nouvelleP(), { type: 'DRAW' });
    const apres = poserJuste(avant);
    expect(apres.errors).toBe(0);
    expect(apres.hand).toHaveLength(0);
    expect(apres.known.size).toBe(avant.known.size + 1);
    expect(apres.selectedCell).toBeNull();
  });

  it('compte une erreur et garde la carte sur une pose fausse', () => {
    const avant = reduce(nouvelleP(), { type: 'DRAW' });
    const apres = poserFaux(avant);
    expect(apres.errors).toBe(1);
    expect(apres.hand).toEqual(avant.hand);
    expect(apres.selectedCell).toBeNull();
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
      s = s.hand.length === 0 ? reduce(s, { type: 'DRAW' }) : poserJuste(s);
    }
    expect(s.status).toBe('won');
    expect(s.errors).toBe(0);
  });
});

describe('SELECT_CELL', () => {
  it('désélectionne quand on reclique la même case', () => {
    const i = nouvelleP().board.findIndex((c) => c.kind === 'letter' && c.filled === null);
    const s = reduce(nouvelleP(), { type: 'SELECT_CELL', index: i });
    expect(reduce(s, { type: 'SELECT_CELL', index: i }).selectedCell).toBeNull();
  });

  it('refuse une case fixe', () => {
    const s = nouvelleP();
    const fixe = s.board.findIndex((c) => c.kind === 'fixed');
    expect(reduce(s, { type: 'SELECT_CELL', index: fixe }).selectedCell).toBeNull();
  });

  it('refuse une case déjà remplie', () => {
    const s = nouvelleP();
    const remplie = s.board.findIndex((c) => c.kind === 'letter' && c.filled !== null);
    expect(reduce(s, { type: 'SELECT_CELL', index: remplie }).selectedCell).toBeNull();
  });
});

describe('isPlayable', () => {
  it('exclut une case dont le code résolu contredit la carte du dessus', () => {
    const s = reduce(nouvelleP(), { type: 'DRAW' });
    const carte = topCard(s)!;
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
    const s = reduce(nouvelleP(), { type: 'DRAW' });
    const inconnue = s.board.findIndex(
      (c) => c.kind === 'letter' && c.filled === null && !s.known.has(c.code),
    );
    expect(isPlayable(s, inconnue)).toBe(true);
  });
});

describe('RESTART', () => {
  it('rejoue la même citation avec un chiffrement différent', () => {
    const avant = nouvelleP();
    const apres = reduce(avant, { type: 'RESTART', seed: 'autre-graine' });
    expect(apres.puzzle.text).toBe(avant.puzzle.text);
    expect(apres.status).toBe('playing');
    expect(apres.errors).toBe(0);
    expect(apres.hand).toHaveLength(0);
    expect(apres.deck).not.toEqual(avant.deck);
  });
});
