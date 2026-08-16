import { describe, it, expect } from 'vitest';
import { createGame, reduce, pileTopCard } from './game';
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

const enMain = (s: GameState) => s.piles.reduce((total, pile) => total + pile.length, 0);

/** Joue le sommet de la première pile correcte trouvée. Pioche si toutes les piles sont vides. */
function jouerCarteJuste(s: GameState): GameState {
  for (let pileIndex = 0; pileIndex < s.piles.length; pileIndex++) {
    const carte = pileTopCard(s, pileIndex);
    if (carte === null) continue;
    const index = s.board.findIndex(
      (c, i) => c.kind === 'letter' && c.filled === null && s.puzzle.solution[i] === carte,
    );
    if (index < 0) continue;
    return reduce(reduce(s, { type: 'SELECT_PILE', index: pileIndex }), { type: 'PLAY', index });
  }
  return reduce(s, { type: 'DRAW' });
}

describe('invariants du moteur', () => {
  it('|pioche| + |cartes en main| = cases vides, après chaque action', () => {
    for (const text of CITATIONS) {
      for (const seed of GRAINES.slice(0, 10)) {
        let s = createGame('q', text, { seed });
        expect(s.deck.length + enMain(s)).toBe(casesVides(s));

        for (let i = 0; i < 200 && s.status === 'playing'; i++) {
          s =
            enMain(s) === 0 || (s.deck.length > 0 && i % 3 === 0)
              ? reduce(s, { type: 'DRAW' })
              : jouerCarteJuste(s);
          expect(s.deck.length + enMain(s)).toBe(casesVides(s));
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
          s = enMain(s) === 0 ? reduce(s, { type: 'DRAW' }) : jouerCarteJuste(s);
        }

        expect(s.status, `citation "${text}" / graine ${seed}`).toBe('won');
        expect(s.errors).toBe(0);
        expect(s.deck).toHaveLength(0);
        expect(enMain(s)).toBe(0);
      }
    }
  });

  it('toute pile non vide a un sommet jouable quelque part sur le plateau', () => {
    for (const seed of GRAINES) {
      let s = reduce(createGame('q', CITATIONS[1], { seed }), { type: 'DRAW' });

      while (s.status === 'playing') {
        for (let pileIndex = 0; pileIndex < s.piles.length; pileIndex++) {
          const carte = pileTopCard(s, pileIndex);
          if (carte === null) continue;
          const cible = s.board.findIndex(
            (c, i) => c.kind === 'letter' && c.filled === null && s.puzzle.solution[i] === carte,
          );
          expect(cible, `graine ${seed}, pile ${pileIndex}`).toBeGreaterThanOrEqual(0);
        }

        s = jouerCarteJuste(s);
      }
    }
  });
});
