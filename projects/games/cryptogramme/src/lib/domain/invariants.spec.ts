import { describe, it, expect } from 'vitest';
import { createGame, reduce, topCard } from './game';
import type { GameState } from './game';

/**
 * Preuves par simulation.
 *
 * Ces tests ne vérifient pas un comportement ponctuel mais des propriétés qui doivent tenir
 * sur l'ensemble des parties possibles. Un échec ici signale toujours un défaut du moteur,
 * jamais du test.
 */

const CITATIONS = [
  "L'idee vient en marchant.",
  "Rien n'est plus puissant qu'une idée dont l'heure est venue.",
  'Éàê ; ôùç !', // accents et ponctuation dense
  'A.', // cas dégénéré : un seul symbole
  'ABA', // cas dégénéré : deux symboles distincts
];

const GRAINES = Array.from({ length: 50 }, (_, i) => `graine-${i}`);

const casesVides = (s: GameState) =>
  s.board.filter((c) => c.kind === 'letter' && c.filled === null).length;

/** Joue la carte du dessus sur une case où elle est correcte. Pioche si la main est vide. */
function jouerCarteJuste(s: GameState): GameState {
  const carte = topCard(s);
  if (carte === null) return reduce(s, { type: 'DRAW' });
  const index = s.board.findIndex(
    (c, i) => c.kind === 'letter' && c.filled === null && s.puzzle.solution[i] === carte,
  );
  if (index < 0) return s;
  return reduce(reduce(s, { type: 'SELECT_CELL', index }), { type: 'PLAY' });
}

describe('invariants du moteur', () => {
  it('|pioche| + |main| = cases vides, après chaque action', () => {
    for (const text of CITATIONS) {
      for (const seed of GRAINES.slice(0, 10)) {
        let s = createGame('q', text, { seed });
        expect(s.deck.length + s.hand.length).toBe(casesVides(s));

        for (let i = 0; i < 200 && s.status === 'playing'; i++) {
          s =
            s.hand.length === 0 || (s.deck.length > 0 && i % 3 === 0)
              ? reduce(s, { type: 'DRAW' })
              : jouerCarteJuste(s);
          expect(s.deck.length + s.hand.length).toBe(casesVides(s));
        }
      }
    }
  });

  it('une partie jouée parfaitement se gagne toujours, sans erreur', () => {
    for (const text of CITATIONS) {
      for (const seed of GRAINES) {
        let s = createGame('q', text, { seed });
        let garde = 0;

        while (s.status === 'playing' && garde++ < 500) {
          s = s.hand.length === 0 ? reduce(s, { type: 'DRAW' }) : jouerCarteJuste(s);
        }

        expect(s.status, `citation "${text}" / graine ${seed}`).toBe('won');
        expect(s.errors).toBe(0);
        expect(s.deck).toHaveLength(0);
        expect(s.hand).toHaveLength(0);
      }
    }
  });

  it('la carte du dessus a toujours au moins une case valide', () => {
    for (const seed of GRAINES) {
      let s = createGame('q', CITATIONS[1], { seed });
      s = reduce(s, { type: 'DRAW' });

      while (s.status === 'playing') {
        const carte = topCard(s)!;
        const cible = s.board.findIndex(
          (c, i) => c.kind === 'letter' && c.filled === null && s.puzzle.solution[i] === carte,
        );
        expect(cible, `graine ${seed}`).toBeGreaterThanOrEqual(0);

        s = jouerCarteJuste(s);
        if (s.hand.length === 0 && s.deck.length > 0) s = reduce(s, { type: 'DRAW' });
      }
    }
  });

  it('la main ne dépasse jamais sa capacité, même en piochant sans relâche', () => {
    for (const seed of GRAINES.slice(0, 20)) {
      let s = createGame('q', CITATIONS[1], { seed });
      for (let i = 0; i < 100; i++) {
        s = reduce(s, { type: 'DRAW' });
        expect(s.hand.length).toBeLessThanOrEqual(s.puzzle.handCapacity);
      }
    }
  });
});
